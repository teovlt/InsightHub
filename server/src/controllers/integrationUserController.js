import crypto from "crypto";
import { encrypt } from "../utils/crypto.js";
import { IntegrationUser } from "../models/integrationUser.js";
import { Integration } from "../models/integrationModel.js";
import { getMaxStreak, getTotalCommits, getTotalStars } from "../utils/github/stats.js";
import { Stat } from "../models/statModel.js";
import { Category } from "../models/categoryModel.js";
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

    // 3️⃣ Mets à jour l'IntegrationUser de base
    await IntegrationUser.findOneAndUpdate(
      { userId, integrationId },
      {
        userId,
        integrationId,
        connected: true,
        accessToken: encrypt(access_token),
        config: { githubUser },
      },
      { upsert: true, new: true },
    );

    // 5️⃣ Récupère les valeurs GitHub
    const totalCommits = await getTotalCommits(access_token, githubUser.created_at);
    const maxStreak = await getMaxStreak(access_token);
    const totalStars = await getTotalStars(access_token);

    // 6️⃣ Supprime les stats doublons côté Integration
    await Integration.findByIdAndUpdate(integrationId, {
      $pull: { availableStats: { name: { $in: ["Total Commits", "Max Streak", "Total Stars"] } } },
    });

    // 7️⃣ Ajoute les nouvelles
    await Integration.findByIdAndUpdate(integrationId, {
      $push: {
        availableStats: [
          {
            name: "Total Commits",
            value: totalCommits,
            dataType: "number",
            description: "Total number of commits made by the user on GitHub.",
          },
          {
            name: "Max Streak",
            value: maxStreak,
            dataType: "number",
            description: "Maximum consecutive days of commits made by the user on GitHub.",
            unit: "days",
          },
          {
            name: "Total Stars",
            value: totalStars,
            dataType: "number",
            description: "Total number of stars received by the user on GitHub.",
          },
        ],
      },
    });

    // 8️⃣ Récupère l’intégration mise à jour pour choper les `_id`
    const integration = await Integration.findById(integrationId).lean();

    // ➜ Map nom stat -> _id du availableStat correspondant
    const availableStatsMap = {};
    integration.availableStats.forEach((s) => {
      availableStatsMap[s.name] = s._id;
    });

    //Les mettre dans integrationUser
    await IntegrationUser.findOneAndUpdate({ userId, integrationId }, { activedStat: integration.availableStats });

    // 🔟 Assure la catégorie côté Stat
    let githubCategory = await Category.findOne({
      name: "GitHub",
      description: "Stats fetched from your GitHub account",
    });
    if (!githubCategory) {
      githubCategory = await Category.create({
        name: "GitHub",
        description: "Stats fetched from your GitHub account",
        icon: "Github",
        color: "#24292e",
      });
    }

    // 1️⃣1️⃣ Upsert des Stat personnelles avec lien vers availableStat
    const statsData = [
      {
        name: "Total Commits",
        description: "Total number of commits made by the user on GitHub.",
        value: totalCommits.toString(),
        unit: "",
      },
      {
        name: "Max Streak",
        description: "Maximum consecutive days of commits made by the user on GitHub.",
        value: maxStreak.toString(),
        unit: "days",
      },
      {
        name: "Total Stars",
        description: "Total number of stars received by the user on GitHub.",
        value: totalStars.toString(),
        unit: "",
      },
    ];

    for (const stat of statsData) {
      await Stat.findOneAndUpdate(
        { userId, categoryId: githubCategory._id, name: stat.name },
        {
          $set: {
            description: stat.description,
            value: stat.value,
            unit: stat.unit,
            current: true,
            hided: false,
            integrationId: integrationId,
            integrationStatId: availableStatsMap[stat.name],
          },
        },
        { upsert: true, new: true },
      );
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

    await integrationUser.save();

    const { accessToken, ...publicIntegrationUser } = integrationUser.toObject();

    return res
      .status(200)
      .json({ integrationUser: publicIntegrationUser, message: isActive ? "Stat deactivated successfully." : "Stat activated successfully." });
  } catch (error) {
    handleServerError(res, error);
  }
};

export const syncStatistics = async (req, res) => {
  const { integrationId } = req.params;

  try {
    const result = await autoSyncStats(req.userId, integrationId);
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
