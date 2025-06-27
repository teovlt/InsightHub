import express from "express";
import { verifyToken } from "../middlewares/verifyToken.js";
import { createStat, deleteStat, rollbackStat, updateStat } from "../controllers/statController.js";

export const statRouter = new express.Router();

/**
 * @route POST /
 * @description Creates a new stat.
 * @middleware verifyToken() - Ensures the user is authenticated.
 * @param {Object} statData - The data for the new stat.
 */
statRouter.post("/", verifyToken(), createStat);

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
statRouter.put("/:id", verifyToken(), updateStat);

/**
 * @route POST /rollback/:id
 * @description Rollback a stat to its previous version.
 *  Sets current: false on current version and current: true on the most recent previous one.
 * @param {string} id - The ID of the current stat version to rollback.
 * @middleware verifyToken() - Ensures the user is authenticated.
 * @returns {Object} JSON response with the rolled-back stat or message.
 */
statRouter.post("/rollback/:id", verifyToken(), rollbackStat);
