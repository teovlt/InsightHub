import { Stat } from "../models/statModel.js";
import { handleServerError } from "../utils/httpErrors.js";
import { getActivatedStatMap, isStatShown } from "../utils/stats.js";

const DAY = 24 * 60 * 60 * 1000;
const PERIODS = { "7d": 7, "30d": 30, "90d": 90, "1y": 365 };
// The activity heatmap always covers at least this many days, whatever the period
const HEATMAP_DAYS = 182;

const safeTimeZone = (tz) => {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return tz;
  } catch {
    return "UTC";
  }
};

/**
 * Analytics for the dashboard charts over a period (?period=7d|30d|90d|1y, default 30d):
 * daily activity (manual vs synced) and activity per category.
 * Every version of a stat is one data point, whether it was typed by hand or synced from an integration.
 *
 * @param {Object} req - The request object, query { period, tz }.
 * @param {Object} res - The response object.
 * @returns {Object} JSON response { period, activity, categories }.
 */
export const getStatsAnalytics = async (req, res) => {
  const userId = req.userId;
  const period = PERIODS[req.query.period] ? req.query.period : "30d";
  const days = PERIODS[period];
  const dayKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: safeTimeZone(req.query.tz || "UTC"),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const now = Date.now();
  const since = new Date(now - days * DAY);
  const activitySince = new Date(now - Math.max(days, HEATMAP_DAYS) * DAY);

  try {
    const [currentStats, activatedMap, versions] = await Promise.all([
      Stat.find({ userId, current: true }).populate("categoryId", "name color icon").lean(),
      getActivatedStatMap(userId),
      Stat.find({ userId, createdAt: { $gte: activitySince } })
        .select("categoryId name integrationId createdAt")
        .lean(),
    ]);

    const shown = currentStats.filter((stat) => stat.categoryId && isStatShown(stat, activatedMap));
    const shownKeys = new Set(shown.map((stat) => `${stat.categoryId._id}|${stat.name}`));
    const shownVersions = versions.filter((version) => shownKeys.has(`${version.categoryId}|${version.name}`));

    // Daily activity, bucketed in the viewer's time zone, with every day present (empty ones at 0)
    const countsByDay = new Map();
    for (const version of shownVersions) {
      if (version.createdAt < activitySince) continue;
      const key = dayKey.format(version.createdAt);
      const entry = countsByDay.get(key) ?? { manual: 0, synced: 0 };
      entry[version.integrationId ? "synced" : "manual"] += 1;
      countsByDay.set(key, entry);
    }
    const activity = [];
    const today = dayKey.format(new Date(now));
    for (let t = activitySince.getTime(); ; t += DAY) {
      const key = dayKey.format(new Date(t));
      if (key > today) break;
      if (activity.at(-1)?.date !== key) activity.push({ date: key, ...(countsByDay.get(key) ?? { manual: 0, synced: 0 }) });
    }

    const inPeriod = shownVersions.filter((version) => version.createdAt >= since);

    // Activity per category over the period
    const byCategory = new Map();
    for (const stat of shown) {
      const id = stat.categoryId._id.toString();
      const entry = byCategory.get(id) ?? { ...stat.categoryId, _id: id, stats: 0, updates: 0 };
      entry.stats += 1;
      byCategory.set(id, entry);
    }
    for (const version of inPeriod) {
      const entry = byCategory.get(version.categoryId.toString());
      if (entry) entry.updates += 1;
    }

    res.status(200).json({
      period,
      activity,
      categories: [...byCategory.values()].sort((a, b) => b.updates - a.updates || b.stats - a.stats),
    });
  } catch (err) {
    handleServerError(res, err);
  }
};
