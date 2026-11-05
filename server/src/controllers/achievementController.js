import { evaluateAchievements, listAchievements } from "../achievements/service.js";
import { handleServerError } from "../utils/httpErrors.js";

/**
 * Every achievement with the user's progress, highest unlocked tier and unlock dates.
 * Tiers reached before achievements existed are unlocked here, silently (no toast storm on first visit).
 *
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @returns {Object} JSON response { achievements }.
 */
export const getAchievements = async (req, res) => {
  try {
    await evaluateAchievements(req.userId, { notify: false });
    res.status(200).json({ achievements: await listAchievements(req.userId) });
  } catch (err) {
    handleServerError(res, err);
  }
};
