import { decrypt, encrypt } from "../utils/crypto.js";
import { IntegrationUser } from "../models/integrationUser.js";
import { ProviderError } from "./http.js";

/*
 * Generic OAuth 2 authorization code flow, for providers declaring an `oauth` block:
 * - authorizeUrl, tokenUrl, scope (space or comma separated, as the service expects)
 * - clientIdEnv, clientSecretEnv: names of the server keys
 * - tokenAuth: "body" (client id and secret in the form) or "basic" (HTTP Basic header, Spotify)
 * - authorizeParams: extra query parameters of the authorization page
 * The tokens are stored encrypted as JSON: { accessToken, refreshToken, expiresAt } (expiresAt in ms).
 * GitHub keeps its own flow (utils/github), its tokens never expire.
 */

// Refresh a little before the real expiry so a sync never starts with a token about to die
const EXPIRY_MARGIN = 2 * 60 * 1000;
const TOKEN_TIMEOUT = 15000;

/**
 * @function getCallbackUrl
 * @description The redirect URI given to the service. It must match the one registered in the service's app settings.
 * OAUTH_CALLBACK_BASE_URL overrides the request host (Spotify refuses "localhost": use http://127.0.0.1:3000 in development).
 * @param {Object} req - Express request (trust proxy makes protocol/host reflect the public URL).
 * @param {Object} provider - Provider definition.
 * @returns {string} The callback URL.
 */
export const getCallbackUrl = (req, provider) => {
  const base = process.env.OAUTH_CALLBACK_BASE_URL?.replace(/\/+$/, "") || `${req.protocol}://${req.get("host")}`;
  return `${base}/api/integrations/auth/oauth/${provider.key}/callback`;
};

/**
 * @function buildAuthorizeUrl
 * @description The service page where the user grants access.
 * @param {Object} provider - Provider with an oauth block.
 * @param {string} redirectUri - Callback URL.
 * @param {string} state - Single-use anti-CSRF value.
 * @returns {string} The URL to redirect the user to.
 */
export const buildAuthorizeUrl = (provider, redirectUri, state) => {
  const { oauth } = provider;
  const params = new URLSearchParams({
    client_id: process.env[oauth.clientIdEnv],
    redirect_uri: redirectUri,
    response_type: "code",
    scope: oauth.scope,
    state,
    ...oauth.authorizeParams,
  });
  return `${oauth.authorizeUrl}?${params.toString()}`;
};

// Turns any token endpoint answer into the stored shape. A refresh may omit the refresh token (Spotify): keep the old one.
const normalizeTokens = (data, previous = {}) => ({
  accessToken: data.access_token,
  refreshToken: data.refresh_token ?? previous.refreshToken,
  expiresAt: data.expires_at ? data.expires_at * 1000 : data.expires_in ? Date.now() + data.expires_in * 1000 : null,
});

const requestTokens = async (provider, form) => {
  const { oauth } = provider;
  const clientId = process.env[oauth.clientIdEnv];
  const clientSecret = process.env[oauth.clientSecretEnv];
  const headers = { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" };
  const body = new URLSearchParams(form);

  if (oauth.tokenAuth === "basic") {
    headers.Authorization = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
  } else {
    body.set("client_id", clientId);
    body.set("client_secret", clientSecret);
  }

  const response = await fetch(oauth.tokenUrl, { method: "POST", headers, body, signal: AbortSignal.timeout(TOKEN_TIMEOUT) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) {
    // invalid_grant: the user revoked the access on the service, only a new connection can fix it
    if (data.error === "invalid_grant" || response.status === 400 || response.status === 401) {
      throw new ProviderError(`${provider.name} refused the access: reconnect the integration.`);
    }
    throw new Error(`${new URL(oauth.tokenUrl).host} answered ${response.status}`);
  }
  return data;
};

/**
 * @function exchangeCode
 * @description Trades the authorization code for tokens.
 * @returns {Promise<{ tokens: Object, raw: Object }>} Stored tokens, and the raw answer (Strava sends the athlete in it).
 */
export const exchangeCode = async (provider, code, redirectUri) => {
  const raw = await requestTokens(provider, { grant_type: "authorization_code", code, redirect_uri: redirectUri });
  return { tokens: normalizeTokens(raw), raw };
};

/**
 * @function refreshTokens
 * @description Gets a new access token from the refresh token.
 * @param {Object} provider - Provider with an oauth block.
 * @param {Object} tokens - Stored tokens.
 * @returns {Promise<Object>} The new stored tokens.
 */
export const refreshTokens = async (provider, tokens) => {
  if (!tokens.refreshToken) throw new ProviderError(`${provider.name} access expired: reconnect the integration.`);
  const raw = await requestTokens(provider, { grant_type: "refresh_token", refresh_token: tokens.refreshToken });
  return normalizeTokens(raw, tokens);
};

export const serializeTokens = (tokens) => encrypt(JSON.stringify(tokens));

/**
 * @function getCredential
 * @description What provider.fetchStats receives: the stored credential, or for OAuth providers
 * a valid access token, refreshed (and saved) first when it is about to expire.
 * @param {Object} integrationUser - Connection (lean), with its encrypted accessToken.
 * @param {Object} provider - Provider definition.
 * @returns {Promise<string>} The credential.
 */
export const getCredential = async (integrationUser, provider) => {
  const stored = decrypt(integrationUser.accessToken);
  if (!provider.oauth) return stored;

  const tokens = JSON.parse(stored);
  if (tokens.expiresAt && tokens.expiresAt - EXPIRY_MARGIN > Date.now()) return tokens.accessToken;
  if (!tokens.expiresAt && !tokens.refreshToken) return tokens.accessToken;

  const fresh = await refreshTokens(provider, tokens);
  await IntegrationUser.updateOne({ _id: integrationUser._id }, { accessToken: serializeTokens(fresh) });
  return fresh.accessToken;
};
