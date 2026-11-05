import { Integration } from "../models/integrationModel.js";
import { IntegrationUser } from "../models/integrationUser.js";
import { handleServerError } from "../utils/httpErrors.js";
import { getPagination } from "../utils/pagination.js";
import { repairActivatedStats } from "../utils/stats.js";

export const getIntegrations = async (req, res) => {
  const { size, skip } = getPagination(req.query);

  try {
    const integrations = await Integration.find({}).sort({ createdAt: -1 }).skip(skip).limit(size);

    const count = await Integration.countDocuments();

    res.status(200).json({ integrations, count });
  } catch (err) {
    handleServerError(res, err);
  }
};
export const getEnabledIntegrations = async (req, res) => {
  try {
    const userId = req.userId;

    // 1. Intégrations disponibles
    const integrations = await Integration.find({ status: "available" }).sort({ name: 1 }).lean();

    // 2. Connexions de l'utilisateur (sans le token chiffré)
    const userIntegrations = await IntegrationUser.find({ userId, connected: true }).select("-accessToken").lean();

    // Older connections may still reference stat ids that no longer exist
    for (const userIntegration of userIntegrations) {
      const integration = integrations.find((i) => i._id.toString() === userIntegration.integrationId.toString());
      if (integration) userIntegration.activedStat = await repairActivatedStats(userIntegration, integration);
    }

    // 3. Création d'une map pour lookup rapide
    const connectedSet = new Set(userIntegrations.map((ui) => ui.integrationId.toString()));

    // 4. Merge: ajoute un champ isConnected et fallback activedStat
    const integrationsWithConnection = integrations.map((integration) => {
      const integrationUser = userIntegrations.find((ui) => ui.integrationId.toString() === integration._id.toString()) || {
        activedStat: [],
      };

      return {
        ...integration,
        isConnected: connectedSet.has(integration._id.toString()),
        integrationUser,
      };
    });

    res.status(200).json(integrationsWithConnection);
  } catch (err) {
    handleServerError(res, err);
  }
};

export const createIntegration = async (req, res) => {
  try {
    const {
      name,
      description = "",
      icon = "",
      color = "",
      category = "",
      status = "available",
      availableStats = [],
      config = {},
    } = req.body;

    const newIntegration = new Integration({
      name,
      description,
      icon,
      color,
      category,
      status,
      availableStats,
      config,
    });

    await newIntegration.save();

    res.status(201).json({
      message: "Integration created successfully.",
      integration: newIntegration,
    });
  } catch (err) {
    handleServerError(res, err);
  }
};

export const updateIntegration = async (req, res) => {
  const { id } = req.params;

  try {
    // req.body only holds the validated fields that were sent
    // An admin choosing the status takes over from the automatic one
    const update = req.body.status ? { ...req.body, autoDisabled: false } : req.body;
    const integration = await Integration.findByIdAndUpdate(id, update, { new: true, runValidators: true });
    if (!integration) {
      return res.status(404).json({ error: "Integration not found." });
    }
    res.status(200).json({
      message: "Integration updated successfully.",
      integration,
    });
  } catch (err) {
    handleServerError(res, err);
  }
};

export const deleteIntegration = async (req, res) => {
  const { id } = req.params;

  try {
    const integration = await Integration.findByIdAndDelete(id);
    if (!integration) {
      return res.status(404).json({ error: "Integration not found." });
    }

    res.status(200).json({ message: "Integration deleted successfully." });
  } catch (err) {
    handleServerError(res, err);
  }
};

/**
 * Disconnects the connected user from an integration and drops the stored access token.
 * The selected stats are kept so a later reconnection restores them.
 */
export const disconnect = async (req, res) => {
  const { integrationId } = req.params;

  try {
    const integrationUser = await IntegrationUser.findOneAndUpdate(
      { userId: req.userId, integrationId },
      { connected: false, $unset: { accessToken: 1 } },
      { new: true },
    );
    if (!integrationUser) {
      return res.status(404).json({ error: "server.integrations.errors.not_connected" });
    }
    res.status(200).json({ message: "server.integrations.messages.disconnected" });
  } catch (err) {
    handleServerError(res, err);
  }
};
