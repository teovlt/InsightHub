import { User } from "../models/userModel.js";
import { Stat } from "../models/statModel.js";
import { Integration } from "../models/integrationModel.js";
import { IntegrationUser } from "../models/integrationUser.js";
import { Log } from "../models/logModel.js";
import { UserAchievement } from "../models/userAchievementModel.js";
import { authTypes } from "../utils/enums/authTypes.js";
import { handleServerError } from "../utils/httpErrors.js";

const DAY = 24 * 60 * 60 * 1000;
const SIGNUP_DAYS = 30;

/**
 * Everything the admin dashboard shows, in one call:
 * - users: total, new this week and this month, active this week (logged at least one value), split by sign-in method
 * - signups: new accounts per day over the last 30 days (UTC, oldest first)
 * - content: tracked stats, values logged this week, goals set, badges unlocked
 * - integrations: connections per integration and how many of them fail to sync
 * - logs: errors and warnings of the week, and the latest ones
 *
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
export const getAdminOverview = async (req, res) => {
  const now = Date.now();
  const weekAgo = new Date(now - 7 * DAY);
  const monthAgo = new Date(now - SIGNUP_DAYS * DAY);

  try {
    const [
      total,
      newWeek,
      newMonth,
      activeUsers,
      byAuth,
      signupRows,
      stats,
      valuesWeek,
      goals,
      badges,
      integrations,
      connections,
      problemsWeek,
      latestProblems,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ createdAt: { $gte: weekAgo } }),
      User.countDocuments({ createdAt: { $gte: monthAgo } }),
      Stat.distinct("userId", { createdAt: { $gte: weekAgo } }),
      Promise.all(Object.values(authTypes).map(async (type) => ({ type, count: await User.countDocuments({ auth_type: type }) }))),
      User.aggregate([
        { $match: { createdAt: { $gte: monthAgo } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
      ]),
      Stat.countDocuments({ current: true }),
      Stat.countDocuments({ createdAt: { $gte: weekAgo } }),
      Stat.countDocuments({ current: true, "goal.target": { $exists: true } }),
      UserAchievement.countDocuments(),
      Integration.find().select("name icon color status").sort({ name: 1 }).lean(),
      IntegrationUser.find({ connected: true }).select("integrationId lastSyncedAt lastSyncAttemptAt").lean(),
      Log.countDocuments({ level: { $in: ["error", "warn"] }, createdAt: { $gte: weekAgo } }),
      Log.find({ level: { $in: ["error", "warn"] } })
        .sort({ createdAt: -1 })
        .limit(5)
        .select("message level createdAt")
        .lean(),
    ]);

    // One entry per day, zeros included, so the chart has no holes
    const signupsByDay = new Map(signupRows.map((row) => [row._id, row.count]));
    const signups = Array.from({ length: SIGNUP_DAYS }, (_, i) => {
      const date = new Date(now - (SIGNUP_DAYS - 1 - i) * DAY).toISOString().slice(0, 10);
      return { date, count: signupsByDay.get(date) ?? 0 };
    });

    // A connection fails when its last background attempt did not end in a sync
    const isFailing = (c) => c.lastSyncAttemptAt && (!c.lastSyncedAt || new Date(c.lastSyncAttemptAt) > new Date(c.lastSyncedAt));
    const perIntegration = integrations.map((integration) => {
      const own = connections.filter((c) => c.integrationId.toString() === integration._id.toString());
      return { ...integration, connections: own.length, failing: own.filter(isFailing).length };
    });

    res.status(200).json({
      users: { total, newWeek, newMonth, activeWeek: activeUsers.length, byAuth },
      signups,
      content: { stats, valuesWeek, goals, badges },
      integrations: perIntegration.sort((a, b) => b.connections - a.connections),
      logs: { problemsWeek, latest: latestProblems },
    });
  } catch (err) {
    handleServerError(res, err);
  }
};
