import { Stat } from "../models/statModel.js";

/**
 * Create a new stat.
 *
 * @param {Object} req - The request object containing stat data.
 * @param {Object} res - The response object to send the result.
 * @returns {Object} JSON response with created stat or error.
 */
export const createStat = async (req, res) => {
  const { name, description, value, unit, categoryId, hided } = req.body;
  const userId = req.userId;

  if (!name || !value || !categoryId) {
    return res.status(400).json({ error: "Missing fields" });
  }

  try {
    const existingStat = await Stat.findOne({
      userId,
      categoryId,
      name,
      current: true,
    });

    if (existingStat) {
      return res.status(400).json({ error: "Stat with this name already exists" });
    }

    const stat = await Stat.create({
      userId,
      categoryId,
      name,
      description,
      value,
      unit,
      current: true,
      hided,
    });

    res.status(201).json({ stat, message: "Stat created successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Delete a specific stat by ID.
 *
 */
export const deleteStat = async (req, res) => {
  const { id } = req.params;

  try {
    const stat = await Stat.findById(id);

    if (!stat) {
      return res.status(400).json({ error: "No such stat" });
    }

    await Stat.deleteMany({
      userId: stat.userId,
      categoryId: stat.categoryId,
      name: stat.name,
    });

    res.status(200).json({ message: "Stat deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Update a stat by ID while keeping history.
 * Marks old stat as current: false and creates a new one.
 *
 * @param {Object} req - The request object with new stat data.
 * @param {Object} res - The response object.
 * @returns {Object} JSON response with new stat or error.
 */
export const updateStat = async (req, res) => {
  const { id } = req.params;
  const { description, value, unit, categoryId, hided } = req.body;

  if (!value || !categoryId) {
    return res.status(400).json({ error: "Missing fields" });
  }

  try {
    const oldStat = await Stat.findOne({ _id: id, current: true });

    if (!oldStat) {
      return res.status(404).json({ error: "No such current stat" });
    }

    // if the value is the same, no need to create a new stat
    if (oldStat.value !== value) {
      oldStat.current = false;
      await oldStat.save();

      const newStat = await Stat.create({
        userId: oldStat.userId,
        categoryId: oldStat.categoryId,
        name: oldStat.name,
        description: description || oldStat.description,
        value: value !== undefined ? value : oldStat.value,
        unit: unit || oldStat.unit,
        hided: typeof hided === "boolean" ? hided : oldStat.hided,
        current: true,
      });
      res.status(200).json({
        message: "Stat updated with history kept",
        stat: newStat,
      });
    } else {
      await oldStat.updateOne({
        description: description || oldStat.description,
        unit: unit || oldStat.unit,
        hided: typeof hided === "boolean" ? hided : oldStat.hided,
      });

      res.status(200).json({
        message: "Stat updated successfully",
        stat: oldStat,
      });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Rollback a stat to its previous version.
 * Sets current: false on current version and current: true on the most recent previous one.
 *
 * @param {Object} req - The request object with the stat ID to rollback.
 * @param {Object} res - The response object.
 * @returns {Object} JSON response with rolled-back stat or message.
 */
export const rollbackStat = async (req, res) => {
  const { id } = req.params; // id de la stat current à rollback

  try {
    // Trouver la stat courante (celle qu'on veut rollback)
    const currentStat = await Stat.findById(id);
    if (!currentStat) {
      return res.status(404).json({ error: "Stat not found" });
    }
    if (!currentStat.current) {
      return res.status(400).json({ error: "This stat is not current" });
    }

    // Supprimer la version current
    await Stat.findByIdAndDelete(id);

    // Trouver la version la plus récente (hors current) avec même userId, category et name
    const previousStat = await Stat.findOne({
      userId: currentStat.userId,
      categoryId: currentStat.categoryId,
      name: currentStat.name,
      current: false,
      _id: { $ne: currentStat._id },
    }).sort({ updatedAt: -1 }); // la plus récente en updatedAt

    if (!previousStat) {
      // Pas d’ancienne version dispo
      return res.status(200).json({ message: "Rollback done: no previous version found, current stat deleted" });
    }

    // Activer la version précédente
    previousStat.current = true;
    await previousStat.save();

    res.status(200).json({ message: "Rollback successful", stat: previousStat });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
