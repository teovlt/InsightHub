import express from "express";
import { verifyToken } from "../middlewares/verifyToken.js";
import { createStat } from "../controllers/statController.js";

export const statRouter = new express.Router();

/**
 * @route POST /
 * @description Creates a new stat.
 * @middleware verifyToken() - Ensures the user is authenticated.
 * @param {Object} statData - The data for the new stat.
 */
statRouter.post("/", verifyToken(), createStat);
