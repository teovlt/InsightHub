import { Integration } from "../models/integrationModel.js";
import { IntegrationUser } from "../models/integrationUser.js";

export const getIntegrations = async (req, res) => {
  const size = parseInt(req.query.size);
  const page = parseInt(req.query.page);

  try {
    const integrations = await Integration.find({})
      .sort({ createdAt: -1 })
      .skip(page * size)
      .limit(size);

    const count = await Integration.countDocuments();

    res.status(200).json({ integrations, count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getEnabledIntegrations = async (req, res) => {
  try {
    const userId = req.userId;

    // 1. Intégrations disponibles
    const integrations = await Integration.find({ status: "available" }).sort({ createdAt: -1 }).lean();

    // 2. Connexions de l'utilisateur
    const userIntegrations = await IntegrationUser.find({ userId, connected: true }).lean();

    // 3. Création d'une map pour lookup rapide
    const connectedSet = new Set(userIntegrations.map((ui) => ui.integrationId.toString()));

    // 4. Merge: ajoute un champ isConnected
    const integrationsWithConnection = integrations.map((integration) => ({
      ...integration,
      isConnected: connectedSet.has(integration._id.toString()),
    }));

    res.status(200).json(integrationsWithConnection);
  } catch (err) {
    res.status(500).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
  }
};

export const updateIntegration = async (req, res) => {
  const { id } = req.params;
  const { name, description, icon, color, category, status, availableStats, config } = req.body;

  try {
    const integration = await Integration.findByIdAndUpdate(
      id,
      {
        name,
        description,
        icon,
        color,
        category,
        status,
        availableStats,
        config,
      },
      { new: true, runValidators: true },
    );
    if (!integration) {
      return res.status(404).json({ error: "Integration not found." });
    }
    res.status(200).json({
      message: "Integration updated successfully.",
      integration,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
  }
};

export const disconnect = async (req, res) => {
  const { userId, integrationId } = req.params;

  try {
    const integrationUser = await IntegrationUser.findOneAndUpdate({ userId, integrationId }, { connected: false }, { new: true });
    if (!integrationUser) {
      return res.status(404).json({ error: "Integration connection not found." });
    }
    res.status(200).json({ message: "Integration disconnected successfully." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
