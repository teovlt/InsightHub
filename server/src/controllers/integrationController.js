import { Integration } from "../models/integrationModel.js";

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

export const createIntegration = async (req, res) => {
  try {
    const {
      key,
      name,
      description = "",
      icon = "",
      color = "",
      category = "",
      status = "available",
      availableStats = [],
      config = {},
    } = req.body;

    // Vérifier clé unique
    const exists = await Integration.findOne({ key });
    if (exists) {
      return res.status(400).json({ error: "Integration key already exists." });
    }

    const newIntegration = new Integration({
      key,
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
    console.error(err);
    res.status(500).json({ error: "Server error: " + err.message });
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
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
