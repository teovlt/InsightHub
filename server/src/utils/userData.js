import { bucket } from "../lib/firebase.js";
import { IntegrationUser } from "../models/integrationUser.js";
import { Stat } from "../models/statModel.js";

/**
 * @function toPublicUser
 * @description Returns a plain user object without its secret fields.
 * @param {Object} user - Mongoose user document.
 * @returns {Object} The user without password and tokenVersion.
 */
export const toPublicUser = (user) => {
  const { password, tokenVersion, ...publicUser } = user.toObject();
  return publicUser;
};

/**
 * @function deleteAvatarFile
 * @description Removes a user's avatar from Firebase Storage, ignoring missing files.
 * @param {string} avatarUrl - Public URL of the avatar.
 */
export const deleteAvatarFile = async (avatarUrl) => {
  if (!avatarUrl) return;
  const fileName = avatarUrl.split("/").pop();
  await bucket
    .file(`avatars/${fileName}`)
    .delete()
    .catch(() => {});
};

/**
 * @function deleteUserData
 * @description Deletes everything owned by a user (stats, integration connections and their tokens, avatar).
 * Logs are kept as an audit trail.
 * @param {Object} user - The deleted user.
 */
export const deleteUserData = async (user) => {
  await Promise.all([
    Stat.deleteMany({ userId: user._id }),
    IntegrationUser.deleteMany({ userId: user._id }),
    deleteAvatarFile(user.avatar),
  ]);
};
