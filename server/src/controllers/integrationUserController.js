import crypto from "crypto";
import { encrypt } from "../utils/crypto.js";
import { IntegrationUser } from "../models/integrationUser.js";
import { Integration } from "../models/integrationModel.js";
import { ensureGithubStats } from "../utils/github/integration.js";
import { autoSyncStats } from "../utils/stats.js";
import { handleServerError } from "../utils/httpErrors.js";
import { getProvider, getProviderByKey, isProviderReady } from "../integrations/index.js";
import { buildAuthorizeUrl, exchangeCode, getCallbackUrl, serializeTokens } from "../integrations/oauth.js";
import { ensureProviderStats } from "../integrations/ensure.js";
import { ProviderError } from "../integrations/http.js";

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

/**
 * Sends the connected user to the authorization page of an OAuth provider (Strava, Spotify...).
 * The state, kept in the session, ties the callback to this user and integration.
 *
 * @param {Object} req - The request object, params { provider }, query { integrationId }.
 * @param {Object} res - The response object.
 */
export const redirectToOAuth = async (req, res) => {
  const provider = getProviderByKey(req.params.provider);
  if (!provider?.oauth) return res.status(404).json({ error: "server.integrations.errors.not_found" });
  if (!isProviderReady(provider)) return res.status(500).json({ error: `Missing env variables for ${provider.name} OAuth.` });

  try {
    const integration = await Integration.findOne({ _id: req.query.integrationId, provider: provider.key, status: "available" });
    if (!integration) return res.status(404).json({ error: "server.integrations.errors.not_found" });

    const state = crypto.randomBytes(16).toString("hex");
    req.session.oauth = { state, provider: provider.key, integrationId: integration._id.toString(), userId: req.userId };

    const url = buildAuthorizeUrl(provider, getCallbackUrl(req, provider), state);
    // The state must be persisted before the service redirects back
    req.session.save((err) => {
      if (err) return handleServerError(res, err);
      res.redirect(url);
    });
  } catch (error) {
    handleServerError(res, error);
  }
};

/**
 * Return from an OAuth provider: trades the code for tokens, stores them encrypted, then runs the first sync.
 * Always ends on the client's integrations page, with ?error= when something failed.
 *
 * @param {Object} req - The request object, params { provider }, query { code, state, error }.
 * @param {Object} res - The response object.
 */
export const oauthCallback = async (req, res) => {
  const provider = getProviderByKey(req.params.provider);
  const context = req.session.oauth;
  // The state is single-use
  delete req.session.oauth;
  const back = (error) => res.redirect(`${getClientUrl()}/integrations${error ? `?error=${error}` : ""}`);

  if (!provider?.oauth) return res.status(404).send("Unknown integration.");
  // The user clicked "Cancel" on the service
  if (req.query.error) return back("denied");
  if (!req.query.code) return res.status(400).send(`No code provided for ${provider.name} OAuth.`);
  if (!context || !req.query.state || req.query.state !== context.state || context.provider !== provider.key) {
    return res.status(400).send("Invalid OAuth state.");
  }

  const { userId, integrationId } = context;
  try {
    const { tokens, raw } = await exchangeCode(provider, req.query.code, getCallbackUrl(req, provider));
    const { account, config } = await provider.connect(tokens.accessToken, raw, { grantedScope: req.query.scope });

    await IntegrationUser.findOneAndUpdate(
      { userId, integrationId },
      {
        userId,
        integrationId,
        connected: true,
        accessToken: serializeTokens(tokens),
        config: { account, ...config },
        $unset: { lastSyncedAt: 1 },
      },
      { upsert: true, new: true },
    );

    // First connection: every stat is activated; a reconnection keeps the user's choice
    const updated = await ensureProviderStats(integrationId, provider);
    const integrationUser = await IntegrationUser.findOne({ userId, integrationId }).lean();
    if (!integrationUser.activedStat?.length) {
      await IntegrationUser.updateOne({ _id: integrationUser._id }, { activedStat: updated.availableStats.map((stat) => stat._id) });
    }

    const result = await autoSyncStats(userId, integrationId, { force: true });
    back(result.error ? "sync" : null);
  } catch (err) {
    console.error(`${provider.key} OAuth:`, err.message);
    back(provider.key);
  }
};

export const toggleActivedStat = async (req, res) => {
  try {
    const userId = req.userId;
    const { integrationId, statId } = req.params;

    if (!integrationId || !statId) {
      return res.status(400).json({ error: "server.global.errors.missing_fields" });
    }

    // Récupérer l’instance IntegrationUser
    const integrationUser = await IntegrationUser.findOne({ userId, integrationId });

    if (!integrationUser) {
      return res.status(404).json({ error: "server.integrations.errors.not_connected" });
    }

    const integration = await Integration.findById(integrationId).lean();
    if (!integration?.availableStats?.some((stat) => stat._id.toString() === statId)) {
      return res.status(404).json({ error: "server.integrations.errors.stat_not_found" });
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

    return res.status(200).json({
      integrationUser: publicIntegrationUser,
      message: isActive ? "server.integrations.messages.stat_deactivated" : "server.integrations.messages.stat_activated",
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
      if (result.error === "IntegrationUser not found") {
        return res.status(404).json({ error: "server.integrations.errors.not_connected" });
      }
      // A ProviderError says what the user can do (reconnect, make the profile public...): show it as is
      const error =
        result.error === "No activated stats to sync"
          ? "server.integrations.errors.no_active_stats"
          : result.userMessage || "server.integrations.errors.sync_failed";
      return res.status(400).json({ error });
    }

    return res.status(200).json({
      message: "server.integrations.messages.synced",
      updatedStats: result.updatedStats,
    });
  } catch (error) {
    handleServerError(res, error);
  }
};

/**
 * Connects the user to an integration that needs a username or a personal API key (no OAuth redirect).
 * The credential is checked with the service, stored encrypted, then the first sync runs.
 *
 * @param {Object} req - The request object, body { credential }.
 * @param {Object} res - The response object.
 */
export const connectWithCredential = async (req, res) => {
  const { integrationId } = req.params;
  const userId = req.userId;

  try {
    const integration = await Integration.findOne({ _id: integrationId, status: "available" }).lean();
    const provider = getProvider(integration);
    if (!integration || !provider) {
      return res.status(404).json({ error: "server.integrations.errors.not_found" });
    }
    if (provider.auth === "oauth") {
      return res.status(400).json({ error: "server.integrations.errors.oauth_only" });
    }

    let verified;
    try {
      verified = await provider.verify(req.body.credential);
    } catch (err) {
      if (err instanceof ProviderError) return res.status(400).json({ error: err.message });
      console.error(`${provider.key} verify:`, err.message);
      return res.status(502).json({ error: "server.integrations.errors.unreachable", params: { name: provider.name } });
    }

    await IntegrationUser.findOneAndUpdate(
      { userId, integrationId },
      {
        userId,
        integrationId,
        connected: true,
        accessToken: encrypt(verified.credential ?? req.body.credential),
        config: { account: verified.account },
        $unset: { lastSyncedAt: 1 },
      },
      { upsert: true, new: true },
    );

    // First connection: every stat is activated; a reconnection keeps the user's choice
    const updated = await ensureProviderStats(integrationId, provider);
    const integrationUser = await IntegrationUser.findOne({ userId, integrationId }).lean();
    if (!integrationUser.activedStat?.length) {
      await IntegrationUser.updateOne({ _id: integrationUser._id }, { activedStat: updated.availableStats.map((stat) => stat._id) });
    }

    const result = await autoSyncStats(userId, integrationId, { force: true });

    res.status(200).json({
      message: result.error ? "server.integrations.messages.connected_sync_failed" : "server.integrations.messages.connected",
      params: { name: provider.name },
      account: verified.account,
    });
  } catch (err) {
    handleServerError(res, err);
  }
};
