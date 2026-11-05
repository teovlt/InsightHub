/**
 * Catalog of achievements (succès). Each achievement has up to three tiers, unlocked when its progress
 * reaches the tier's threshold. `progress` is pure: it reads the snapshot built by collectUserData
 * (see achievements/service.js) and returns a number, so it is trivial to test.
 *
 * Labels and descriptions live on the client (locales, key pages.achievements.items.<id>).
 */

export const TIERS = ["bronze", "silver", "gold"];

/**
 * @typedef {Object} UserData
 * @property {number} connectedApps - Integrations currently connected.
 * @property {number} syncedApps - Connected integrations synced at least once.
 * @property {number} goalsReached - Current stats whose goal is reached.
 * @property {number} statsCreated - Distinct stats the user tracks (current versions).
 * @property {number} loggedDays - Distinct days with at least one value logged.
 * @property {number} bestStreak - Longest run of consecutive days with a value logged.
 */

/** @type {{ id: string, icon: string, thresholds: number[], progress: (data: UserData) => number }[]} */
export const ACHIEVEMENTS = [
  { id: "apps_connected", icon: "Link2", thresholds: [1, 3, 5], progress: (data) => data.connectedApps ?? 0 },
  { id: "first_sync", icon: "RefreshCw", thresholds: [1], progress: (data) => data.syncedApps ?? 0 },
  { id: "goals_reached", icon: "Target", thresholds: [1, 3, 10], progress: (data) => data.goalsReached ?? 0 },
  { id: "stats_created", icon: "BarChart3", thresholds: [5, 20, 50], progress: (data) => data.statsCreated ?? 0 },
  { id: "days_logged", icon: "CalendarCheck", thresholds: [7, 30, 100], progress: (data) => data.loggedDays ?? 0 },
  { id: "streak", icon: "Flame", thresholds: [3, 7, 30], progress: (data) => data.bestStreak ?? 0 },
];

/**
 * @function tiersOf
 * @description The tiers of an achievement, cheapest first. A single-threshold achievement only has "bronze",
 * so every achievement starts with the same color.
 * @param {Object} achievement - Catalog entry.
 * @returns {{ tier: string, threshold: number }[]}
 */
export const tiersOf = (achievement) => achievement.thresholds.map((threshold, i) => ({ tier: TIERS[i], threshold }));

/**
 * @function reachedTiers
 * @description Tiers whose threshold the progress has reached.
 * @param {Object} achievement - Catalog entry.
 * @param {number} progress - Value returned by achievement.progress.
 * @returns {string[]}
 */
export const reachedTiers = (achievement, progress) =>
  tiersOf(achievement)
    .filter(({ threshold }) => progress >= threshold)
    .map(({ tier }) => tier);

/**
 * @function isGoalReached
 * @description A goal is reached once the value gets to the target, in the goal's direction.
 * @param {{ numericValue?: number|null, goal?: { target?: number, direction?: string } }} stat
 * @returns {boolean}
 */
export const isGoalReached = (stat) => {
  const target = stat.goal?.target;
  const value = stat.numericValue;
  if (typeof target !== "number" || typeof value !== "number") return false;
  return stat.goal.direction === "decrease" ? value <= target : value >= target;
};

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * @function dayKeys
 * @description Distinct UTC days (as day numbers since epoch) of the given dates, sorted.
 * @param {Date[]} dates
 * @returns {number[]}
 */
export const dayKeys = (dates) => [...new Set(dates.map((date) => Math.floor(new Date(date).getTime() / DAY_MS)))].sort((a, b) => a - b);

/**
 * @function longestStreak
 * @description Longest run of consecutive days in a sorted list of distinct day numbers.
 * @param {number[]} days - From dayKeys.
 * @returns {number}
 */
export const longestStreak = (days) => {
  let best = 0;
  let run = 0;
  days.forEach((day, i) => {
    run = i > 0 && day - days[i - 1] === 1 ? run + 1 : 1;
    best = Math.max(best, run);
  });
  return best;
};
