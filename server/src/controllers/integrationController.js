import { Integration } from "../models/integrationModel";

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
