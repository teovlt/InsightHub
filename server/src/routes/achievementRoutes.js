import express from "express";
import { verifyToken } from "../middlewares/verifyToken.js";
import { getAchievements } from "../controllers/achievementController.js";

export const achievementRouter = new express.Router();

/**
 * @route GET /
 * @description Every achievement with the user's progress, tier and unlock dates.
 * @middleware verifyToken() - Ensures the user is authenticated.
 */
achievementRouter.get("/", verifyToken(), getAchievements);
