import express from "express";
import { getConfig, updateConfig } from "../controllers/configController.js";
import { verifyToken } from "../middlewares/verifyToken.js";
import { validateBody } from "../middlewares/validate.js";
import { updateConfigSchema } from "../validation/schemas.js";

export const configRouter = new express.Router();

/**
 * @route GET /
 * @description Retrieves public configuration settings (whitelisted keys only) based on provided keys.
 */
configRouter.get("/", getConfig);

/**
 * @route PUT /
 * @description Updates configuration settings based on provided keys and values.
 * @middleware verifyToken({ role: "admin" }) - Ensures the user is authenticated and has the 'admin' role.
 */
configRouter.put("/", verifyToken({ role: "admin" }), validateBody(updateConfigSchema), updateConfig);
