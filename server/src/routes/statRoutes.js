import express from "express";
import { verifyToken } from "../middlewares/verifyToken.js";
import { validateBody } from "../middlewares/validate.js";
import { createStatSchema, pinStatSchema, statGoalSchema, updateStatSchema } from "../validation/schemas.js";
import { createStat, deleteStat, getStatHistory, pinStat, rollbackStat, setStatGoal, updateStat } from "../controllers/statController.js";
import { getStatsAnalytics } from "../controllers/statAnalyticsController.js";
import { getStatsOverview } from "../controllers/statOverviewController.js";

export const statRouter = new express.Router();

/**
 * @route POST /
 * @description Creates a new stat.
 * @middleware verifyToken() - Ensures the user is authenticated.
 * @param {Object} statData - The data for the new stat.
 */
statRouter.post("/", verifyToken(), validateBody(createStatSchema), createStat);

/**
 * @route GET /overview
 * @description Dashboard data: this week, highlights, pinned stats, goals with their pace, stats to log, moments, next badge.
 * @param {string} [tz] - IANA time zone used for days and streaks.
 * @middleware verifyToken() - Ensures the user is authenticated.
 */
statRouter.get("/overview", verifyToken(), getStatsOverview);

/**
 * @route GET /analytics
 * @description Dashboard charts: daily activity and activity per category over a period.
 * @param {string} [period] - 7d, 30d (default), 90d or 1y.
 * @param {string} [tz] - IANA time zone used to bucket activity by day.
 * @middleware verifyToken() - Ensures the user is authenticated.
 */
statRouter.get("/analytics", verifyToken(), getStatsAnalytics);

/**
 * @route GET /:id/history
 * @description Every version of a stat, oldest first.
 * @param {string} id - The ID of any version of the stat.
 * @middleware verifyToken() - Ensures the user is authenticated.
 */
statRouter.get("/:id/history", verifyToken(), getStatHistory);

/**
 * @route PATCH /:id/pin
 * @description Pins or unpins a stat on the dashboard.
 * @param {string} id - The ID of the current version of the stat.
 * @middleware verifyToken() - Ensures the user is authenticated.
 */
statRouter.patch("/:id/pin", verifyToken(), validateBody(pinStatSchema), pinStat);

/**
 * @route PATCH /:id/goal
 * @description Sets (or clears with target: null) the goal of a numeric stat.
 * @param {string} id - The ID of the current version of the stat.
 * @middleware verifyToken() - Ensures the user is authenticated.
 */
statRouter.patch("/:id/goal", verifyToken(), validateBody(statGoalSchema), setStatGoal);

/**
 * @route DELETE /:id
 * @description Deletes a specific stat by ID.
 * @param {string} id - The ID of the stat to delete.
 * @middleware verifyToken() - Ensures the user is authenticated.
 */
statRouter.delete("/:id", verifyToken(), deleteStat);

/**
 * @route PUT /:id
 * @description Updates a stat by ID while keeping history.
 *  Marks old stat as current: false and creates a new one.
 * @param {string} id - The ID of the stat to update.
 * @middleware verifyToken() - Ensures the user is authenticated.
 * @returns {Object} JSON response with the updated stat or error.
 */
statRouter.put("/:id", verifyToken(), validateBody(updateStatSchema), updateStat);

/**
 * @route POST /rollback/:id
 * @description Rollback a stat to its previous version.
 *  Sets current: false on current version and current: true on the most recent previous one.
 * @param {string} id - The ID of the current stat version to rollback.
 * @middleware verifyToken() - Ensures the user is authenticated.
 * @returns {Object} JSON response with the rolled-back stat or message.
 */
statRouter.post("/rollback/:id", verifyToken(), rollbackStat);
