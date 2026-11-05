import { Category } from "../models/categoryModel.js";
import { Stat } from "../models/statModel.js";
import { handleServerError } from "../utils/httpErrors.js";
import { emitToUser } from "../sockets/socket.js";
import { inferGoalDirection } from "../utils/goals.js";
import { checkAchievements } from "../achievements/service.js";

// Lets the user's other open tabs refresh their dashboard
const notifyChange = (userId) => emitToUser(userId, "stats:updated");

// Every query below is scoped to req.userId: a user can only read or change their own stats.

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

  try {
    if (!(await Category.exists({ _id: categoryId }))) {
      return res.status(404).json({ error: "No such category" });
    }

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
      integrationId: null,
      integrationStatId: null,
    });

    notifyChange(userId);
    await checkAchievements(userId);
    res.status(201).json({ stat, message: "Stat created successfully" });
  } catch (err) {
    handleServerError(res, err);
  }
};

/**
 * Delete a specific stat by ID.
 *
 */
export const deleteStat = async (req, res) => {
  const { id } = req.params;

  try {
    const stat = await Stat.findOne({ _id: id, userId: req.userId });

    if (!stat) {
      return res.status(400).json({ error: "No such stat" });
    }

    await Stat.deleteMany({
      userId: stat.userId,
      categoryId: stat.categoryId,
      name: stat.name,
    });

    notifyChange(req.userId);
    res.status(200).json({ message: "Stat deleted successfully" });
  } catch (err) {
    handleServerError(res, err);
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
  const { name, description, value, unit, hided } = req.body;

  try {
    const oldStat = await Stat.findOne({ _id: id, userId: req.userId, current: true });

    if (!oldStat) {
      return res.status(404).json({ error: "No such current stat" });
    }

    // Si on veut changer le nom :
    if (name && name !== oldStat.name) {
      // Check que le nom n’existe pas déjà pour ce user + category
      const nameExists = await Stat.findOne({
        userId: oldStat.userId,
        categoryId: oldStat.categoryId,
        name: name,
      });

      if (nameExists) {
        return res.status(400).json({ error: "A stat with this new name already exists" });
      }

      // Update toutes les versions
      await Stat.updateMany(
        {
          userId: oldStat.userId,
          categoryId: oldStat.categoryId,
          name: oldStat.name,
        },
        {
          $set: { name },
        },
      );
    }

    // Si la value change => versionning
    if (oldStat.value !== value) {
      oldStat.current = false;
      await oldStat.save();

      const newStat = await Stat.create({
        userId: oldStat.userId,
        categoryId: oldStat.categoryId,
        name: name || oldStat.name,
        description: description || oldStat.description,
        value,
        unit: unit || oldStat.unit,
        hided: typeof hided === "boolean" ? hided : oldStat.hided,
        pinned: oldStat.pinned,
        goal: oldStat.goal,
        current: true,
      });

      notifyChange(req.userId);
      await checkAchievements(req.userId);
      return res.status(200).json({
        message: "Stat updated with history kept",
        stat: newStat,
      });
    } else {
      // Pas de nouvelle value => simple maj
      oldStat.description = description || oldStat.description;
      oldStat.unit = unit || oldStat.unit;
      oldStat.hided = typeof hided === "boolean" ? hided : oldStat.hided;

      await oldStat.save();

      return res.status(200).json({
        message: "Stat updated successfully",
        stat: oldStat,
      });
    }
  } catch (err) {
    handleServerError(res, err);
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
    const currentStat = await Stat.findOne({ _id: id, userId: req.userId });
    if (!currentStat) {
      return res.status(404).json({ error: "Stat not found" });
    }
    if (!currentStat.current) {
      return res.status(400).json({ error: "This stat is not current" });
    }

    // Supprimer la version current
    await Stat.findByIdAndDelete(id);
    notifyChange(req.userId);

    // Trouver la version la plus récente (hors current) avec même userId, category et name
    const previousStat = await Stat.findOne({
      userId: currentStat.userId,
      categoryId: currentStat.categoryId,
      name: currentStat.name,
      current: false,
      _id: { $ne: currentStat._id },
    }).sort({ createdAt: -1 }); // la plus récente : updatedAt bouge aussi lors d'un renommage

    if (!previousStat) {
      // Pas d’ancienne version dispo
      return res.status(200).json({ message: "Rollback done: no previous version found, current stat deleted" });
    }

    // Activer la version précédente
    previousStat.current = true;
    await previousStat.save();

    res.status(200).json({ message: "Rollback successful", stat: previousStat });
  } catch (err) {
    handleServerError(res, err);
  }
};

// A stat is identified across its versions by owner, category and name
const versionsOf = (stat) => ({ userId: stat.userId, categoryId: stat.categoryId, name: stat.name });

const HISTORY_FIELDS = "value numericValue createdAt";

/**
 * Pin or unpin a stat on the dashboard (applies to every version).
 *
 * @param {Object} req - The request object, body { pinned: boolean }.
 * @param {Object} res - The response object.
 * @returns {Object} JSON response with the updated stat or error.
 */
export const pinStat = async (req, res) => {
  try {
    const stat = await Stat.findOne({ _id: req.params.id, userId: req.userId, current: true });
    if (!stat) {
      return res.status(404).json({ error: "No such current stat" });
    }

    await Stat.updateMany(versionsOf(stat), { $set: { pinned: req.body.pinned } });
    stat.pinned = req.body.pinned;

    res.status(200).json({ stat, message: req.body.pinned ? "Stat pinned" : "Stat unpinned" });
  } catch (err) {
    handleServerError(res, err);
  }
};

/**
 * Set or clear the goal of a numeric stat (applies to every version).
 *
 * @param {Object} req - The request object, body { target: number|null, deadline?: date|null, direction?: "increase"|"decrease" }.
 *  Without a direction, a target below the current value is a "decrease" goal.
 * @param {Object} res - The response object.
 * @returns {Object} JSON response with the updated stat or error.
 */
export const setStatGoal = async (req, res) => {
  const { target, deadline, direction } = req.body;

  try {
    const stat = await Stat.findOne({ _id: req.params.id, userId: req.userId, current: true });
    if (!stat) {
      return res.status(404).json({ error: "No such current stat" });
    }
    if (target !== null && stat.type === "text") {
      return res.status(400).json({ error: "Only numeric stats can have a goal" });
    }

    let update = { $unset: { goal: 1 } };
    if (target !== null) {
      const goalDirection = direction ?? inferGoalDirection(stat.numericValue, target);
      // Editing a goal in the same direction keeps where it started, so its progress does not reset
      const start = stat.goal?.direction === goalDirection && typeof stat.goal?.start === "number" ? stat.goal.start : stat.numericValue;
      update = { $set: { goal: { target, deadline: deadline ?? undefined, direction: goalDirection, start: start ?? undefined } } };
    }
    await Stat.updateMany(versionsOf(stat), update);
    const updated = await Stat.findById(stat._id);
    // Setting a goal the stat already meets counts as reaching it
    if (target !== null) await checkAchievements(req.userId);

    res.status(200).json({ stat: updated, message: target === null ? "Goal removed" : "Goal saved" });
  } catch (err) {
    handleServerError(res, err);
  }
};

/**
 * Get every version of a stat, oldest first, to draw its evolution.
 *
 * @param {Object} req - The request object with the stat ID.
 * @param {Object} res - The response object.
 * @returns {Object} JSON response with the history or error.
 */
export const getStatHistory = async (req, res) => {
  try {
    const stat = await Stat.findOne({ _id: req.params.id, userId: req.userId });
    if (!stat) {
      return res.status(404).json({ error: "No such stat" });
    }

    const history = await Stat.find(versionsOf(stat)).select(HISTORY_FIELDS).sort({ createdAt: 1 }).lean();

    res.status(200).json({ history });
  } catch (err) {
    handleServerError(res, err);
  }
};
