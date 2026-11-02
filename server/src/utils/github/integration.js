import { ensureProviderCategory, ensureProviderStats, getStatKey } from "../../integrations/ensure.js";
import { getContributionStats, getTotalStars } from "./stats.js";

export const GITHUB_CATEGORY = {
  name: "GitHub",
  description: "Stats fetched from your GitHub account",
  icon: "Github",
  color: "#24292e",
};

// Stats the GitHub integration knows how to compute. They are shared by every user:
// each user's values live in their own Stat documents, never in the Integration.
export const GITHUB_STATS = [
  {
    id: "total_commits",
    name: "Total Commits",
    description: "Total number of commits made by the user on GitHub.",
    dataType: "number",
    unit: "",
  },
  {
    id: "max_streak",
    name: "Max Streak",
    description: "Longest run of consecutive days with contributions on GitHub.",
    dataType: "number",
    unit: "days",
  },
  {
    id: "total_stars",
    name: "Total Stars",
    description: "Total number of stars received by the user on GitHub.",
    dataType: "number",
    unit: "",
  },
];

const githubDefinition = { stats: GITHUB_STATS, statCategory: GITHUB_CATEGORY };

/**
 * @function getGithubStatKey
 * @description Finds which GitHub stat an availableStat entry stands for (by id, or by name for older entries).
 * @param {Object} availableStat - Entry of Integration.availableStats.
 * @returns {string|null} The GITHUB_STATS id, or null if it is not a GitHub stat.
 */
export const getGithubStatKey = (availableStat) => getStatKey(githubDefinition, availableStat);

/**
 * @function ensureGithubStats
 * @description Adds the GitHub stats missing from the integration (see ensureProviderStats).
 * @param {string} integrationId - The GitHub integration.
 * @returns {Promise<Object|null>} The up-to-date integration (lean), or null if it does not exist.
 */
export const ensureGithubStats = (integrationId) => ensureProviderStats(integrationId, githubDefinition);

/**
 * @function ensureGithubCategory
 * @description Returns the category holding GitHub stats, creating it if needed.
 * @returns {Promise<Object>} The category document.
 */
export const ensureGithubCategory = () => ensureProviderCategory(githubDefinition);

/**
 * @function fetchGithubStats
 * @description Computes the requested GitHub stats, querying only what is needed.
 * @param {string} accessToken - The user's GitHub token.
 * @param {string} createdAt - Creation date of the GitHub account.
 * @param {string[]} keys - GITHUB_STATS ids to compute.
 * @returns {Promise<Object>} Values by GITHUB_STATS id.
 */
export const fetchGithubStats = async (accessToken, createdAt, keys) => {
  const wanted = new Set(keys);
  const needsContributions = wanted.has("total_commits") || wanted.has("max_streak");

  const [contributions, totalStars] = await Promise.all([
    needsContributions ? getContributionStats(accessToken, createdAt) : null,
    wanted.has("total_stars") ? getTotalStars(accessToken) : null,
  ]);

  return {
    total_commits: contributions?.totalCommits ?? null,
    max_streak: contributions?.maxStreak ?? null,
    total_stars: totalStars,
  };
};
