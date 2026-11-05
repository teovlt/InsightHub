import mongoose from "mongoose";
import { Stat } from "../models/statModel.js";
import { IntegrationUser } from "../models/integrationUser.js";
import { UserAchievement } from "../models/userAchievementModel.js";
import { listAchievements } from "../achievements/service.js";
import { handleServerError } from "../utils/httpErrors.js";
import { getActivatedStatMap, isStatShown } from "../utils/stats.js";
import {
  DAY,
  STALE_AFTER,
  WEEK,
  bestValue,
  dayNumber,
  findRecords,
  goalPace,
  safeTimeZone,
  streaks,
  weekChange,
} from "../utils/insights.js";

// Versions of a stat share its user, category and name (see statController versionsOf)
const versionKey = (stat) => `${(stat.categoryId?._id ?? stat.categoryId)?.toString()}:${stat.name}`;
const directionOf = (stat) => (stat.goal?.direction === "decrease" ? "decrease" : "increase");
const isNumeric = (stat) => stat.type === "number" || stat.type === "duration";
// Fields the dashboard needs to show a stat
const summary = (stat) => ({
  _id: stat._id,
  name: stat.name,
  value: stat.value,
  unit: stat.unit,
  type: stat.type,
  numericValue: stat.numericValue,
  hided: stat.hided,
  integrationId: stat.integrationId,
  categoryId: stat.categoryId,
  goal: stat.goal,
  createdAt: stat.createdAt,
});

const HIGHLIGHTS = 4;
const TO_LOG = 4;
const MOMENTS = 8;
const MOMENTS_SINCE = 30 * DAY;
const HISTORY_POINTS = 30;

/**
 * Everything the dashboard shows, computed for the viewer's time zone (?tz=Europe/Paris):
 * - week: values and active days over the last 7 days, current and best streak
 * - highlights: the stats that moved most this week, progress first
 * - pinned: pinned stats with their last 30 values, weekly change and personal best
 * - goals: every goal with its pace (reached, on_track, behind, no_deadline, stalled) and estimated date
 * - toLog: manual stats not updated for a week
 * - moments: recent personal records and unlocked badges, newest first
 * - nextBadge: the achievement closest to its next tier
 * - onboarding: what a new account still has to do (connect an app, create a stat, set a goal)
 *
 * @param {Object} req - The request object, query { tz }.
 * @param {Object} res - The response object.
 */
export const getStatsOverview = async (req, res) => {
  const userId = req.userId;
  const timeZone = safeTimeZone(req.query.tz || "UTC");
  const now = Date.now();

  try {
    const [currentStats, allVersions, activatedMap, badges, achievements, connectedApps] = await Promise.all([
      Stat.find({ userId, current: true }).populate("categoryId", "name color icon").sort({ updatedAt: -1 }).lean(),
      Stat.find({ userId }).select("categoryId name value numericValue createdAt").sort({ createdAt: 1 }).lean(),
      getActivatedStatMap(userId),
      UserAchievement.find({ userId, unlockedAt: { $gte: new Date(now - MOMENTS_SINCE) } })
        .sort({ unlockedAt: -1 })
        .limit(MOMENTS)
        .lean(),
      listAchievements(userId),
      IntegrationUser.countDocuments({ userId: new mongoose.Types.ObjectId(userId.toString()), connected: true }),
    ]);

    const versionsByKey = new Map();
    for (const version of allVersions) {
      const key = versionKey(version);
      if (!versionsByKey.has(key)) versionsByKey.set(key, []);
      versionsByKey.get(key).push(version);
    }
    const versionsOf = (stat) => versionsByKey.get(versionKey(stat)) ?? [];

    // Integration stats the user switched off stay out of the dashboard
    const shown = currentStats.filter((stat) => stat.categoryId && isStatShown(stat, activatedMap));

    // This week and streaks: every logged value counts, manual or synced
    const today = dayNumber(now, timeZone);
    const weekVersions = allVersions.filter((v) => new Date(v.createdAt).getTime() > now - WEEK);
    const week = {
      values: weekVersions.length,
      activeDays: new Set(weekVersions.map((v) => dayNumber(v.createdAt, timeZone))).size,
      streak: streaks(
        allVersions.map((v) => dayNumber(v.createdAt, timeZone)),
        today,
      ),
    };

    const withChange = shown
      .filter((stat) => isNumeric(stat) && !stat.hided)
      .map((stat) => ({ ...summary(stat), week: weekChange(versionsOf(stat), directionOf(stat), now) }))
      .filter((stat) => stat.week && stat.week.delta !== 0);
    const score = (stat) => Math.abs(stat.week.percent ?? 100);
    const highlights = withChange.sort((a, b) => Number(b.week.better) - Number(a.week.better) || score(b) - score(a)).slice(0, HIGHLIGHTS);

    const pinned = shown
      .filter((stat) => stat.pinned)
      .map((stat) => {
        const versions = versionsOf(stat);
        return {
          ...summary(stat),
          history: versions
            .slice(-HISTORY_POINTS)
            .map(({ _id, value, numericValue, createdAt }) => ({ _id, value, numericValue, createdAt })),
          week: weekChange(versions, directionOf(stat), now),
          best: isNumeric(stat) ? bestValue(versions, directionOf(stat)) : null,
        };
      });

    const goals = shown
      .filter((stat) => typeof stat.goal?.target === "number")
      .map((stat) => ({ ...summary(stat), pace: goalPace(versionsOf(stat), stat.goal, now) }))
      // Goals still running first, the closest deadline first; reached goals last
      .sort((a, b) => {
        const done = Number(a.pace.status === "reached") - Number(b.pace.status === "reached");
        if (done) return done;
        const da = a.goal.deadline ? new Date(a.goal.deadline).getTime() : Infinity;
        const db = b.goal.deadline ? new Date(b.goal.deadline).getTime() : Infinity;
        return da - db;
      });

    const toLog = shown
      .filter((stat) => !stat.integrationId && new Date(stat.createdAt).getTime() < now - STALE_AFTER)
      // The ones dropped most recently first: the habit is still fresh
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, TO_LOG)
      .map((stat) => ({ ...summary(stat), daysAgo: Math.floor((now - new Date(stat.createdAt).getTime()) / DAY) }));

    const records = shown
      .filter((stat) => isNumeric(stat) && !stat.hided)
      .flatMap((stat) =>
        findRecords(versionsOf(stat), directionOf(stat))
          .filter((record) => new Date(record.createdAt).getTime() >= now - MOMENTS_SINCE)
          .map((record) => ({
            kind: "record",
            at: record.createdAt,
            value: record.value,
            previous: record.previous,
            stat: { _id: stat._id, name: stat.name, unit: stat.unit, type: stat.type, categoryId: stat.categoryId },
          })),
      );
    const unlocked = badges.map((badge) => ({
      kind: "badge",
      at: badge.unlockedAt,
      achievementId: badge.achievementId,
      tier: badge.tier,
      icon: achievements.find((a) => a.id === badge.achievementId)?.icon,
    }));
    const moments = [...records, ...unlocked].sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, MOMENTS);

    // The badge closest to its next tier (by share of the way), to give a concrete next step
    // A tier already reached but not evaluated yet unlocks on the next event: aim at the first tier still out of reach
    const nextBadge =
      achievements
        .map((a) => ({ a, tier: a.tiers.find((t) => t.threshold > a.progress) }))
        .filter(({ tier }) => tier)
        .map(({ a, tier }) => ({
          id: a.id,
          icon: a.icon,
          progress: a.progress,
          next: { tier: tier.tier, threshold: tier.threshold },
          ratio: a.progress / tier.threshold,
        }))
        .sort((x, y) => y.ratio - x.ratio)[0] ?? null;

    const onboarding = {
      connectedApps,
      stats: currentStats.length,
      goals: currentStats.filter((stat) => typeof stat.goal?.target === "number").length,
    };
    onboarding.done = onboarding.connectedApps > 0 && onboarding.stats > 0 && onboarding.goals > 0;

    res.status(200).json({ week, highlights, pinned, goals, toLog, moments, nextBadge, onboarding });
  } catch (err) {
    handleServerError(res, err);
  }
};
