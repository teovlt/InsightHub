import { Integration } from "../models/integrationModel.js";
import { fetchGithubStats, GITHUB_CATEGORY, GITHUB_STATS } from "../utils/github/integration.js";
import { ensureProviderStats } from "./ensure.js";
import { chesscom, lichess, steam } from "./providers/games.js";
import { codewars, leetcode, monkeytype, wakatime } from "./providers/code.js";
import { duolingo, lastfmProvider, openlibrary } from "./providers/life.js";
import { hevyProvider, stravaProvider } from "./providers/sport.js";
import { letterboxd, spotifyProvider } from "./providers/media.js";

/*
 * A provider describes one third-party service:
 * - auth: "oauth" (redirect flow), "username" (public profile) or "apiKey" (personal key)
 * - oauth: settings of the generic OAuth flow (see oauth.js), with connect(accessToken, tokenAnswer) → { account, config };
 *   GitHub predates it and keeps its own flow
 * - stats: what it can compute; each user's values live in their own Stat documents
 * - verify(credential): checks the username or key on connection, returns { account, credential? }
 * - fetchStats(credential, keys, connection): values by stat id (null when unknown)
 * - requiresEnv: server keys without which the integration stays disabled
 */
export const github = {
  key: "github",
  name: "GitHub",
  description: "Commits, contribution streak and stars from your GitHub account.",
  icon: "Github",
  color: "#24292e",
  category: "Development",
  auth: "oauth",
  authUrl: "auth/github",
  docsUrl: "https://docs.github.com",
  requiresEnv: ["GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET"],
  statCategory: GITHUB_CATEGORY,
  stats: GITHUB_STATS,
  fetchStats: (accessToken, keys, connection) => fetchGithubStats(accessToken, connection.config?.githubUser?.created_at, keys),
};

export const PROVIDERS = [
  github,
  stravaProvider,
  hevyProvider,
  spotifyProvider,
  letterboxd,
  chesscom,
  lichess,
  steam,
  leetcode,
  codewars,
  wakatime,
  monkeytype,
  duolingo,
  lastfmProvider,
  openlibrary,
];

/**
 * @function getProvider
 * @description The provider behind an integration (integrations created before providers are matched by name).
 * @param {Object} integration - Integration document.
 * @returns {Object|null} The provider, or null for an integration no code handles.
 */
export const getProvider = (integration) =>
  PROVIDERS.find((provider) => provider.key === integration?.provider) ??
  PROVIDERS.find((provider) => !integration?.provider && provider.name.toLowerCase() === integration?.name?.toLowerCase()) ??
  null;

export const getProviderByKey = (key) => PROVIDERS.find((provider) => provider.key === key) ?? null;

export const isProviderReady = (provider) => (provider.requiresEnv ?? []).every((name) => Boolean(process.env[name]));

/**
 * @function ensureProviderIntegrations
 * @description Creates the integration of every provider, and keeps their connection settings and stats up to date.
 * Providers missing a server key are disabled; the others keep the status an admin gave them.
 * Runs on each start, so it must stay idempotent.
 */
export const ensureProviderIntegrations = async () => {
  for (const provider of PROVIDERS) {
    const ready = isProviderReady(provider);
    let integration =
      (await Integration.findOne({ provider: provider.key })) ??
      (await Integration.findOne({ provider: { $exists: false }, name: new RegExp(`^${provider.name.replace(".", "\\.")}$`, "i") }));

    const settings = {
      provider: provider.key,
      authType: provider.auth,
      credentialLabel: provider.credentialLabel,
      credentialHelp: provider.credentialHelp,
      credentialPlaceholder: provider.credentialPlaceholder,
      credentialSteps: provider.credentialSteps ?? [],
      "config.docsUrl": provider.docsUrl,
      ...(provider.authUrl && { "config.authUrl": provider.authUrl }),
    };

    if (!integration) {
      integration = await Integration.create({
        name: provider.name,
        description: provider.description,
        icon: provider.icon,
        color: provider.color,
        category: provider.category,
        status: ready ? "available" : "disabled",
        autoDisabled: !ready,
        provider: provider.key,
        authType: provider.auth,
        credentialLabel: provider.credentialLabel,
        credentialHelp: provider.credentialHelp,
        credentialPlaceholder: provider.credentialPlaceholder,
        credentialSteps: provider.credentialSteps ?? [],
        config: { authUrl: provider.authUrl, docsUrl: provider.docsUrl },
      });
    } else {
      // Disabled for a missing key: turned back on once the key is configured, unless an admin changed it since
      const status = !ready
        ? { status: "disabled", autoDisabled: true }
        : integration.autoDisabled
          ? { status: "available", autoDisabled: false }
          : {};
      await Integration.updateOne({ _id: integration._id }, { $set: { ...settings, ...status } });
    }

    await ensureProviderStats(integration._id, provider);
  }
};
