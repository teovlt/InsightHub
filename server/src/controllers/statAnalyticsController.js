import { Stat } from "../models/statModel.js";
import { handleServerError } from "../utils/httpErrors.js";
import { getActivatedStatMap, isStatShown } from "../utils/stats.js";
import { isGoalReached } from "../utils/goals.js";

const DAY = 24 * 60 * 60 * 1000;
const PERIODS = { "7d": 7, "30d": 30, "90d": 90, "1y": 365 };
// The activity heatmap always covers at least this many days, whatever the period
const HEATMAP_DAYS = 182;
// Trend charts drawn on the dashboard, most recently changed first
const MAX_TRENDS = 24;

// A stat is identified across its versions by owner, category and name
const versionsOf = (stat) => ({ userId: stat.userId, categoryId: stat.categoryId._id ?? stat.categoryId, name: stat.name });

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
 * daily activity (manual vs synced), activity per category and the evolution of every numeric stat.
 * Every version of a stat is one data point, whether it was typed by hand or synced from an integration.
 *
 * @param {Object} req - The request object, query { period, tz }.
 * @param {Object} res - The response object.
 * @returns {Object} JSON response { period, kpis, activity, categories, trends }.
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
  const previousSince = new Date(now - 2 * days * DAY);
  const activitySince = new Date(now - Math.max(days, HEATMAP_DAYS) * DAY);

  try {
    const [currentStats, activatedMap, versions] = await Promise.all([
      Stat.find({ userId, current: true }).populate("categoryId", "name color icon").lean(),
      getActivatedStatMap(userId),
      Stat.find({ userId, createdAt: { $gte: previousSince < activitySince ? previousSince : activitySince } })
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
    const inPrevious = shownVersions.filter((version) => version.createdAt >= previousSince && version.createdAt < since);

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

    // Evolution of each numeric stat over the period, starting from the value it had when the period began
    const numeric = shown
      .filter((stat) => stat.type !== "text" && stat.numericValue !== null && !stat.hided)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, MAX_TRENDS);
    const trends = await Promise.all(
      numeric.map(async (stat) => {
        const [baseline, points] = await Promise.all([
          Stat.findOne({ ...versionsOf(stat), createdAt: { $lt: since }, numericValue: { $ne: null } })
            .select("numericValue createdAt")
            .sort({ createdAt: -1 })
            .lean(),
          Stat.find({ ...versionsOf(stat), createdAt: { $gte: since }, numericValue: { $ne: null } })
            .select("numericValue createdAt")
            .sort({ createdAt: 1 })
            .lean(),
        ]);
        const history = baseline ? [{ numericValue: baseline.numericValue, createdAt: since }, ...points] : points;
        const from = history[0]?.numericValue ?? null;
        const to = stat.numericValue;
        return {
          _id: stat._id,
          name: stat.name,
          unit: stat.unit,
          type: stat.type,
          value: stat.value,
          integrationId: stat.integrationId ?? null,
          categoryId: stat.categoryId,
          goal: stat.goal,
          history: history.map(({ numericValue, createdAt }) => ({ numericValue, createdAt })),
          // Values recorded during the period (the baseline point is not one of them)
          updates: points.length,
          change: {
            from,
            to,
            value: from !== null ? to - from : null,
            percent: from ? ((to - from) / Math.abs(from)) * 100 : null,
          },
        };
      }),
    );

    const goals = shown.filter((stat) => typeof stat.goal?.target === "number");
    // Consecutive days with at least one update; today may still be empty without breaking the streak
    let streak = 0;
    for (let i = activity.length - 1; i >= 0; i--) {
      if (activity[i].manual + activity[i].synced > 0) streak++;
      else if (i !== activity.length - 1) break;
    }

    res.status(200).json({
      period,
      kpis: {
        trackedStats: shown.length,
        numericStats: shown.filter((stat) => stat.type !== "text").length,
        syncedStats: shown.filter((stat) => stat.integrationId).length,
        updates: inPeriod.length,
        previousUpdates: inPrevious.length,
        manualUpdates: inPeriod.filter((version) => !version.integrationId).length,
        syncedUpdates: inPeriod.filter((version) => version.integrationId).length,
        goalsTotal: goals.length,
        goalsReached: goals.filter((stat) => isGoalReached(stat.numericValue, stat.goal)).length,
        activeDays: activity.slice(-days).filter((day) => day.manual + day.synced > 0).length,
        streak,
      },
      activity,
      categories: [...byCategory.values()].sort((a, b) => b.updates - a.updates || b.stats - a.stats),
      trends,
    });
  } catch (err) {
    handleServerError(res, err);
  }
};
