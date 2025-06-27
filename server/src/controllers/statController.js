import { Stat } from "../models/statModel.js";

/**
 * Create a new stat.
 *
 * @param {Object} req - The request object containing stat data.
 * @param {Object} res - The response object to send the result.
 * @returns {Object} JSON response with created stat or error.
 */
export const createStat = async (req, res) => {
  const { name, description, value, unit, categoryId } = req.body;
  const userId = req.userId;

  if (!name || !value || !categoryId) {
    return res.status(400).json({ error: "Missing fields" });
  }

  try {
    const stat = await Stat.create({
      userId,
      categoryId,
      name,
      description,
      value,
      unit,
    });

    res.status(201).json({ stat, message: "Stat created successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
