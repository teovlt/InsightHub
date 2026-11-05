import express from "express";
import { getAdminOverview } from "../controllers/adminController.js";
import { verifyToken } from "../middlewares/verifyToken.js";

export const adminRouter = new express.Router();

/**
 * @route GET /overview
 * @description Admin dashboard: users, signups, content, integration health and recent problems.
 * @middleware verifyToken({ role: "admin" }) - Ensures the user is authenticated and has the 'admin' role.
 */
adminRouter.get("/overview", verifyToken({ role: "admin" }), getAdminOverview);
