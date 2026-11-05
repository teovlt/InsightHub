import mongoose from "mongoose";
import { IntegrationUser } from "../models/integrationUser.js";
import { Stat } from "../models/statModel.js";
import { UserAchievement } from "../models/userAchievementModel.js";
import { emitToUser } from "../sockets/socket.js";
import { ACHIEVEMENTS, TIERS, dayKeys, isGoalReached, longestStreak, reachedTiers, tiersOf } from "./catalog.js";

/**
 * @function collectUserData
 * @description Builds the snapshot every achievement's progress function reads.
 * @param {string} userId - The user.
 * @returns {Promise<import("./catalog.js").UserData>}
 */
export const collectUserData = async (userId) => {
  const id = new mongoose.Types.ObjectId(userId.toString());
  const [connections, currentStats, days] = await Promise.all([
    IntegrationUser.find({ userId: id, connected: true }).select("lastSyncedAt").lean(),
    Stat.find({ userId: id, current: true }).select("numericValue goal").lean(),
    // Every version of a stat is a logged value: one row per distinct day
    Stat.aggregate([
      { $match: { userId: id } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, at: { $first: "$createdAt" } } },
    ]),
  ]);

  const loggedDays = dayKeys(days.map((day) => day.at));
  return {
    connectedApps: connections.length,
    syncedApps: connections.filter((connection) => connection.lastSyncedAt).length,
    goalsReached: currentStats.filter(isGoalReached).length,
    statsCreated: currentStats.length,
    loggedDays: loggedDays.length,
    bestStreak: longestStreak(loggedDays),
  };
};

/**
 * @function evaluateAchievements
 * @description Unlocks every tier the user has reached and not unlocked yet. Each tier unlocks once:
 * an existing tier is never touched, so its unlockedAt stays the date it was first reached.
 * @param {string} userId - The user.
 * @param {Object} [options]
 * @param {boolean} [options.notify=true] - Emit `achievement:unlocked` for each new tier.
 * @returns {Promise<{ id: string, tier: string, threshold: number, unlockedAt: Date }[]>} The tiers unlocked now.
 */
export const evaluateAchievements = async (userId, { notify = true } = {}) => {
  const data = await collectUserData(userId);
  const unlocked = [];

  for (const achievement of ACHIEVEMENTS) {
    for (const tier of reachedTiers(achievement, achievement.progress(data))) {
      const unlockedAt = new Date();
      let result;
      try {
        result = await UserAchievement.updateOne(
          { userId, achievementId: achievement.id, tier },
          { $setOnInsert: { unlockedAt } },
          { upsert: true },
        );
      } catch (err) {
        // Another evaluation inserted it at the same time
        if (err.code === 11000) continue;
        throw err;
      }
      if (result.upsertedCount === 1) {
        const threshold = tiersOf(achievement).find((t) => t.tier === tier).threshold;
        unlocked.push({ id: achievement.id, icon: achievement.icon, tier, threshold, unlockedAt });
      }
    }
  }

  if (notify) unlocked.forEach((achievement) => emitToUser(userId, "achievement:unlocked", achievement));
  return unlocked;
};

/**
 * @function checkAchievements
 * @description Fire-safe evaluation for event hooks: an achievement failure never breaks the action
 * that triggered it.
 * @param {string} userId - The user.
 * @returns {Promise<void>}
 */
export const checkAchievements = async (userId) => {
  try {
    await evaluateAchievements(userId);
  } catch (err) {
    console.error("checkAchievements:", err.message);
  }
};

/**
 * @function listAchievements
 * @description Every achievement with the user's progress, its tiers and when each was unlocked.
 * @param {string} userId - The user.
 * @returns {Promise<Object[]>}
 */
export const listAchievements = async (userId) => {
  const [data, unlockedDocs] = await Promise.all([collectUserData(userId), UserAchievement.find({ userId }).lean()]);
  const unlockedAt = new Map(unlockedDocs.map((doc) => [`${doc.achievementId}:${doc.tier}`, doc.unlockedAt]));

  return ACHIEVEMENTS.map((achievement) => {
    const progress = achievement.progress(data);
    const tiers = tiersOf(achievement).map(({ tier, threshold }) => ({
      tier,
      threshold,
      unlockedAt: unlockedAt.get(`${achievement.id}:${tier}`) ?? null,
    }));
    const unlockedTiers = tiers.filter((t) => t.unlockedAt);
    const best = unlockedTiers.sort((a, b) => TIERS.indexOf(b.tier) - TIERS.indexOf(a.tier))[0];
    const next = tiers.find((t) => !t.unlockedAt) ?? null;

    return {
      id: achievement.id,
      icon: achievement.icon,
      progress,
      tier: best?.tier ?? null,
      unlockedAt: best?.unlockedAt ?? null,
      next: next && { tier: next.tier, threshold: next.threshold },
      tiers,
    };
  });
};
