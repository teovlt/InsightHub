import express from "express";
import { verifyToken } from "../middlewares/verifyToken.js";
import { validateBody } from "../middlewares/validate.js";
import { integrationSchema } from "../validation/schemas.js";
import {
  createIntegration,
  deleteIntegration,
  disconnect,
  getEnabledIntegrations,
  getIntegrations,
  updateIntegration,
} from "../controllers/integrationController.js";
import { getGithubUser, redirectToGithub, syncStatistics, toggleActivedStat } from "../controllers/integrationUserController.js";

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
integrationRouter.get("/enabled", verifyToken(), getEnabledIntegrations);

/**
 * POST /api/integrations
 * Crée une nouvelle intégration
 */
integrationRouter.post("/", verifyToken({ role: "admin" }), validateBody(integrationSchema), createIntegration);

/**
 * PUT /api/integrations/:id
 * Met à jour une intégration existante
 */
integrationRouter.put("/:id", verifyToken({ role: "admin" }), validateBody(integrationSchema.partial()), updateIntegration);

/**
 * DELETE /api/integrations/:id
 * Supprime une intégration
 */
integrationRouter.delete("/:id", verifyToken({ role: "admin" }), deleteIntegration);

/**
 * GET /api/integrations/auth/github?integrationId=
 * Redirige l'utilisateur connecté (cookie) vers l'autorisation GitHub
 */
integrationRouter.get("/auth/github", verifyToken(), redirectToGithub);

/**
 * GET /api/integrations/auth/github/callback
 * Retour de GitHub : l'utilisateur est retrouvé via le state stocké en session
 */
integrationRouter.get("/auth/github/callback", getGithubUser);

/**
 * DELETE /api/integrations/:integrationId/connection
 * Déconnecte l'utilisateur connecté de l'intégration
 */
integrationRouter.delete("/:integrationId/connection", verifyToken(), disconnect);

integrationRouter.patch("/:integrationId/stat/:statId/toggle", verifyToken(), toggleActivedStat);

integrationRouter.post("/:integrationId/sync", verifyToken(), syncStatistics);
