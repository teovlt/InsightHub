import express from "express";
import { verifyToken } from "../middlewares/verifyToken.js";
import {
  createIntegration,
  deleteIntegration,
  getEnabledIntegrations,
  getIntegrations,
  updateIntegration,
} from "../controllers/integrationController.js";
import { getGithubUser, redirectToGithub } from "../controllers/integrationUserController.js";

export const integrationRouter = new express.Router();

/**
 * GET /api/integrations
 * Liste toutes les intégrations (pour admin ou public, tu peux filtrer)
 */
integrationRouter.get("/", verifyToken({ role: "admin" }), getIntegrations);

/**
 * GET /api/integrations/enabled
 * Liste uniquement les intégrations activées
 */
integrationRouter.get("/enabled", verifyToken({ role: "admin" }), getEnabledIntegrations);

/**
 * POST /api/integrations
 * Crée une nouvelle intégration
 */
integrationRouter.post("/", verifyToken({ role: "admin" }), createIntegration);

/**
 * PUT /api/integrations/:key
 * Met à jour une intégration existante
 */
integrationRouter.put("/:id", verifyToken({ role: "admin" }), updateIntegration);

/**
 * DELETE /api/integrations/:key
 * Supprime une intégration
 */
integrationRouter.delete("/:id", verifyToken({ role: "admin" }), deleteIntegration);

integrationRouter.get("/auth/github", verifyToken(), redirectToGithub);

integrationRouter.get("/auth/github/callback", getGithubUser);
