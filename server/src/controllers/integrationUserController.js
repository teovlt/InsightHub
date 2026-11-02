import crypto from "crypto";
import { encrypt } from "../utils/crypto.js";
import { IntegrationUser } from "../models/integrationUser.js";
import { Integration } from "../models/integrationModel.js";
import { ensureGithubStats } from "../utils/github/integration.js";
import { autoSyncStats } from "../utils/stats.js";
import { handleServerError } from "../utils/httpErrors.js";

const getClientUrl = () => (process.env.CORS_ORIGIN || "").split(",")[0].trim();

export const redirectToGithub = async (req, res) => {
  const { integrationId } = req.query;
  const userId = req.userId;

  try {
    const { GITHUB_CLIENT_ID } = process.env;

    if (!GITHUB_CLIENT_ID) {
      return res.status(500).json({ error: "Missing env variables for GitHub OAuth." });
    }

    const integration = await Integration.findOne({ _id: integrationId, status: "available" });
    if (!integration) {
      return res.status(404).json({ error: "Integration not found." });
    }

    const state = crypto.randomBytes(16).toString("hex");

    req.session.github_oauth_state = state;
    req.session.github_oauth_integration = integrationId;
    req.session.github_oauth_user = userId;

    const params = new URLSearchParams({
      client_id: GITHUB_CLIENT_ID,
      // Built from the incoming request (trust proxy makes protocol/host reflect the public URL)
      redirect_uri: `${req.protocol}://${req.get("host")}/api/integrations/auth/github/callback`,
      // read:user is enough for contributions and public repositories; "repo" would grant write access to private code
      scope: process.env.GITHUB_OAUTH_SCOPES || "read:user",
      state,
    });

    // The state must be persisted before GitHub redirects back
    req.session.save((err) => {
      if (err) return handleServerError(res, err);
      res.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`);
    });
  } catch (error) {
    handleServerError(res, error);
  }
};

export const getGithubUser = async (req, res) => {
  const { code, state } = req.query;

  const expectedState = req.session.github_oauth_state;
  const integrationId = req.session.github_oauth_integration;
  const userId = req.session.github_oauth_user;

  // The state is single-use
  delete req.session.github_oauth_state;
  delete req.session.github_oauth_integration;
  delete req.session.github_oauth_user;

  if (!code) return res.status(400).send("No code provided for GitHub OAuth.");
  if (!state || state !== expectedState) return res.status(400).send("Invalid OAuth state.");
  if (!userId) return res.status(401).send("No user context");
  if (!integrationId) return res.status(400).send("No integration context");
  if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET)
    return res.status(500).json({ error: "Missing GitHub OAuth env variables." });

  try {
    // 1️⃣ Échange le code contre un access token GitHub
    const response = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      }),
    });

    const data = await response.json();
    if (!data.access_token) return res.status(500).json({ error: "No access token received from GitHub." });

    const access_token = data.access_token;

    // 2️⃣ Récupère l'user GitHub
    const userResponse = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${access_token}`, Accept: "application/vnd.github+json" },
    });
    const githubUser = await userResponse.json();
    if (!githubUser?.id) return res.status(500).json({ error: "Failed to fetch GitHub user." });

    // 3️⃣ Enregistre la connexion (le token est chiffré)
    await IntegrationUser.findOneAndUpdate(
      { userId, integrationId },
      {
        userId,
        integrationId,
        connected: true,
        accessToken: encrypt(access_token),
        config: { githubUser },
        $unset: { lastSyncedAt: 1 },
      },
      { upsert: true, new: true },
    );

    // 4️⃣ Les stats proposées sont partagées : on ajoute seulement celles qui manquent, sans jamais changer leurs _id
    const integration = await ensureGithubStats(integrationId);
    const integrationUser = await IntegrationUser.findOne({ userId, integrationId }).lean();

    // 5️⃣ Première connexion : tout est activé ; une reconnexion garde le choix de l'utilisateur
    if (!integrationUser.activedStat?.length) {
      await IntegrationUser.updateOne({ _id: integrationUser._id }, { activedStat: integration.availableStats.map((stat) => stat._id) });
    }

    // 6️⃣ Crée ou met à jour les Stat personnelles ; un échec ici n'annule pas la connexion
    const result = await autoSyncStats(userId, integrationId, { force: true });
    if (result.error) {
      return res.redirect(`${getClientUrl()}/integrations?error=sync`);
    }

    res.redirect(`${getClientUrl()}/integrations`);
  } catch (err) {
    console.error(err);
    res.redirect(`${getClientUrl()}/integrations?error=github`);
  }
};

export const toggleActivedStat = async (req, res) => {
  try {
    const userId = req.userId;
    const { integrationId, statId } = req.params;

    if (!integrationId || !statId) {
      return res.status(400).json({ error: "Missing integrationId or statId" });
    }

    // Récupérer l’instance IntegrationUser
    const integrationUser = await IntegrationUser.findOne({ userId, integrationId });

    if (!integrationUser) {
      return res.status(404).json({ error: "IntegrationUser not found" });
    }

    const integration = await Integration.findById(integrationId).lean();
    if (!integration?.availableStats?.some((stat) => stat._id.toString() === statId)) {
      return res.status(404).json({ error: "Stat not found for this integration" });
    }

    const isActive = integrationUser.activedStat.some((id) => id.toString() === statId);

    if (isActive) {
      integrationUser.activedStat.pull(statId);
    } else {
      integrationUser.activedStat.push(statId);
    }
    // A newly activated stat must be fetched on the next page load
    integrationUser.lastSyncedAt = undefined;

    await integrationUser.save();

    const { accessToken, ...publicIntegrationUser } = integrationUser.toObject();

    return res
      .status(200)
      .json({
        integrationUser: publicIntegrationUser,
        message: isActive ? "Stat deactivated successfully." : "Stat activated successfully.",
      });
  } catch (error) {
    handleServerError(res, error);
  }
};

export const syncStatistics = async (req, res) => {
  const { integrationId } = req.params;

  try {
    const result = await autoSyncStats(req.userId, integrationId, { force: true });
    if (result.error) {
      return res.status(result.error === "IntegrationUser not found" ? 404 : 400).json({ error: result.error });
    }

    return res.status(200).json({
      message: "Statistics synced successfully",
      updatedStats: result.updatedStats,
    });
  } catch (error) {
    handleServerError(res, error);
  }
};
