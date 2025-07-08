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

export const getEnabledIntegrations = async (req, res) => {
  try {
    const integrations = await Integration.find({ status: "available" }).sort({ createdAt: -1 });

    res.status(200).json(integrations);
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
