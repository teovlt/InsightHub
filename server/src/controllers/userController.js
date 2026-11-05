import { User } from "../models/userModel.js";
import { Stat } from "../models/statModel.js";
import { IntegrationUser } from "../models/integrationUser.js";
import bcrypt from "bcryptjs";
import { userRoles } from "../utils/enums/userRoles.js";
import { createLog } from "./logController.js";
import { logLevels } from "../utils/enums/logLevel.js";

import { generateRandomPassword } from "../utils/generateRandomPassword.js";
import { Constants } from "../../constants/constants.js";
import { authTypes } from "../utils/enums/authTypes.js";
import { saveAvatarFromUrl } from "../utils/saveAvatarFromUrl.js";
import { generateRandomAvatar } from "../utils/generateRandomAvatar.js";
import { handleServerError } from "../utils/httpErrors.js";
import { getPagination } from "../utils/pagination.js";
import { deleteUserData, toPublicUser } from "../utils/userData.js";
import { clearAccessTokenCookie, setAccessTokenCookie } from "../utils/authCookie.js";
import { parseBody } from "../middlewares/validate.js";
import { adminUpdateUserSchema, deleteAccountSchema, selfUpdateUserSchema, updatePasswordSchema } from "../validation/schemas.js";

/**
 * @function isLastAdmin
 * @description Tells whether the user is the only admin left, who must not lose the role.
 * @param {Object} user - User document (with role).
 * @returns {Promise<boolean>} True if removing this admin would leave the app without one.
 */
const isLastAdmin = async (user) => user.role === userRoles.ADMIN && (await User.countDocuments({ role: userRoles.ADMIN })) <= 1;

/**
 * @function getUser
 * @description Retrieves a single user by ID.
 * @returns {Object} JSON response with user details or error message.
 */
export const getUser = async (req, res) => {
  const { id } = req.params;
  try {
    const user = await User.findById(id);
    if (!user) {
      return res.status(400).json({ error: "No such user" });
    }
    res.status(200).json(user);
  } catch (err) {
    handleServerError(res, err);
  }
};

/**
 * @function getUsers
 * @description Retrieves all users sorted by creation date.
 * @returns {Object} JSON response with a list of users or error message.
 */
export const getUsers = async (req, res) => {
  const { size, skip } = getPagination(req.query);

  try {
    const users = await User.find({}).sort({ createdAt: -1 }).skip(skip).limit(size).lean();
    const ids = users.map((user) => user._id);

    const [count, statRows, connectionRows] = await Promise.all([
      User.countDocuments(),
      // Tracked stats (current versions) and the last value logged, per user of the page
      Stat.aggregate([
        { $match: { userId: { $in: ids } } },
        { $group: { _id: "$userId", stats: { $sum: { $cond: ["$current", 1, 0] } }, lastActivity: { $max: "$createdAt" } } },
      ]),
      IntegrationUser.aggregate([{ $match: { userId: { $in: ids }, connected: true } }, { $group: { _id: "$userId", apps: { $sum: 1 } } }]),
    ]);
    const statsBy = new Map(statRows.map((row) => [row._id.toString(), row]));
    const appsBy = new Map(connectionRows.map((row) => [row._id.toString(), row.apps]));

    res.status(200).json({
      users: users.map((user) => ({
        ...user,
        activity: {
          stats: statsBy.get(user._id.toString())?.stats ?? 0,
          lastActivity: statsBy.get(user._id.toString())?.lastActivity ?? null,
          apps: appsBy.get(user._id.toString()) ?? 0,
        },
      })),
      count,
    });
  } catch (err) {
    handleServerError(res, err);
  }
};

/**
 * @function createUser
 * @description Creates a new user with the provided details.
 * @returns {Object} JSON response with user details or error message.
 */
export const createUser = async (req, res) => {
  const { name, forename, email, username, password, role } = req.body;
  const userId = req.userId;

  if (!Constants.REGEX_PASSWORD.test(password)) {
    return res.status(400).json({ error: "server.users.errors.regex_error" });
  }

  try {
    const existingUserByEmail = await User.findOne({ email: email.toLowerCase() });
    const existingUserByUsername = await User.findOne({ username: username.toLowerCase() });

    if (existingUserByEmail) return res.status(409).json({ error: "Email already taken" });
    if (existingUserByUsername) return res.status(409).json({ error: "Username already taken" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      email: email.toLowerCase(),
      username: username.toLowerCase(),
      password: hashedPassword,
      role,
      name,
      forename,
    });

    try {
      user.avatar = await saveAvatarFromUrl(generateRandomAvatar(user.username), user._id, "svg");
      await user.save();
    } catch (err) {
      console.error("Failed to upload avatar to Firebase:", err.message);
    }

    createLog({
      message: `User '${username}' created successfully`,
      userId: userId,
      level: logLevels.INFO,
    });

    res.status(201).json({ user: toPublicUser(user), message: "User created successfully" });
  } catch (err) {
    handleServerError(res, err);
  }
};

/**
 * @function updateUser
 * @description Updates a user's details by ID. Users may only update their own profile fields;
 * admins may update anyone, including role and password.
 * @returns {Object} JSON response with updated user details or error message.
 */
export const updateUser = async (req, res) => {
  const { id } = req.params;
  const userId = req.userId;
  const isAdmin = req.user.role === userRoles.ADMIN;

  if (!isAdmin && id !== userId) {
    return res.status(403).json({ error: "server.global.errors.forbidden" });
  }

  const { data, status, error } = parseBody(isAdmin ? adminUpdateUserSchema : selfUpdateUserSchema, req.body);
  if (error) return res.status(status).json(error);

  try {
    const update = { ...data };

    if (update.email) {
      update.email = update.email.toLowerCase();
      const existingUserByEmail = await User.findOne({ email: update.email, _id: { $ne: id } });
      if (existingUserByEmail) return res.status(409).json({ error: "server.users.errors.email_taken" });
    }

    if (update.username) {
      update.username = update.username.toLowerCase();
      const existingUserByUsername = await User.findOne({ username: update.username, _id: { $ne: id } });
      if (existingUserByUsername) return res.status(409).json({ error: "server.users.errors.username_taken" });
    }

    if (update.role && update.role !== userRoles.ADMIN) {
      const target = await User.findById(id);
      if (target && (await isLastAdmin(target))) return res.status(400).json({ error: "server.users.errors.last_admin" });
    }

    if (update.password) {
      if (!Constants.REGEX_PASSWORD.test(update.password)) {
        return res.status(400).json({ error: "server.users.errors.regex_error" });
      }
      update.password = await bcrypt.hash(update.password, 10);
      // A password reset by an admin signs the user out everywhere
      update.$inc = { tokenVersion: 1 };
    } else {
      delete update.password;
    }

    const user = await User.findOneAndUpdate({ _id: id }, update, { new: true, runValidators: true });
    if (!user) return res.status(404).json({ error: "server.global.errors.no_such_user" });

    if (isAdmin) {
      createLog({
        message: `User '${user.username}' updated successfully`,
        userId: userId,
        level: logLevels.INFO,
      });
    }

    res.status(200).json({ user: toPublicUser(user), message: "server.users.messages.user_updated" });
  } catch (err) {
    handleServerError(res, err);
  }
};

/**
 * @function deleteUser
 * @description Deletes a user by ID, with everything they own.
 * @returns {Object} JSON response with success message or error message.
 */
export const deleteUser = async (req, res) => {
  const { id } = req.params;

  // Admins delete their own account from the account page, which asks for their password
  if (id === req.userId) {
    return res.status(400).json({ error: "server.users.errors.cannot_delete_self" });
  }

  try {
    const target = await User.findById(id);
    if (target && (await isLastAdmin(target))) return res.status(400).json({ error: "server.users.errors.last_admin" });

    const user = await User.findOneAndDelete({ _id: id });
    if (!user) return res.status(400).json({ error: "No such user" });

    await deleteUserData(user);

    createLog({
      message: `User '${user.username}' deleted successfully`,
      userId: req.userId,
      level: logLevels.INFO,
    });

    res.status(200).json({ user, message: "User deleted successfully" });
  } catch (err) {
    handleServerError(res, err);
  }
};

/**
 * @function generateUserPassword
 * @description Generates a random password.
 * @returns {Object} JSON response with generated password.
 */
export const generateUserPassword = async (req, res) => {
  res.status(200).json({ message: "Password generated successfully", password: generateRandomPassword() });
};

/**
 * @function updatePassword
 * @description Updates the password of the connected user. Other sessions are revoked and the current one gets a fresh token.
 * @param {string} req.params.id - The ID of the user whose password is being updated (must be the connected user).
 * @param {string} req.body.currentPassword - The user's current password.
 * @param {string} req.body.newPassword - The new password.
 * @param {string} req.body.newPasswordConfirm - Confirmation of the new password.
 * @returns {Object} JSON response with success message or error message.
 */
export const updatePassword = async (req, res) => {
  const { id } = req.params;

  if (id !== req.userId) {
    return res.status(403).json({ error: "server.global.errors.forbidden" });
  }

  const { data, status, error } = parseBody(updatePasswordSchema, req.body);
  if (error) return res.status(status).json(error);
  const { currentPassword, newPassword, newPasswordConfirm } = data;

  try {
    const user = await User.findById(id).select("+password");
    if (!user) return res.status(400).json({ error: "server.global.errors.no_such_user" });
    if (!user.password) return res.status(400).json({ error: "server.users.errors.no_password" });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(400).json({ error: "server.users.errors.actual_password_incorrect" });

    if (!Constants.REGEX_PASSWORD.test(newPassword)) {
      return res.status(400).json({
        error: "server.users.errors.regex_error",
      });
    }

    if (newPassword !== newPasswordConfirm) {
      return res.status(400).json({ error: "server.users.errors.passwords_do_not_match" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const updatedUser = await User.findByIdAndUpdate(id, { password: hashedPassword, $inc: { tokenVersion: 1 } }, { new: true }).select(
      "+tokenVersion",
    );

    setAccessTokenCookie(res, updatedUser);

    res.status(200).json({ message: "server.users.messages.password_updated" });
  } catch (err) {
    handleServerError(res, err);
  }
};

/**
 * @function deleteAccount
 * @description Deletes the connected user's account, with everything they own, then logs them out.
 * A password account confirms with its password; a Google account by typing its username or email.
 * @param {string} [req.body.password] - The user's password.
 * @param {string} [req.body.confirmation] - The user's username or email, for Google accounts.
 * @returns {Object} JSON response with success or error message.
 */
export const deleteAccount = async (req, res) => {
  const userId = req.userId;

  const { data, status, error } = parseBody(deleteAccountSchema, req.body);
  if (error) return res.status(status).json(error);

  try {
    const user = await User.findById(userId).select("+password");
    if (!user) return res.status(404).json({ error: "server.global.errors.no_such_user" });

    // A Google account is already proven by its Google session: typing its name guards against a slip.
    // Older Google accounts may still hold a password from before, it is not asked for.
    if (user.auth_type !== authTypes.GOOGLE && user.password) {
      if (!data.password) return res.status(422).json({ error: "server.global.errors.missing_fields" });
      const isMatch = await bcrypt.compare(data.password, user.password);
      if (!isMatch) return res.status(400).json({ error: "server.users.errors.password_incorrect" });
    } else {
      if (!data.confirmation) return res.status(422).json({ error: "server.global.errors.missing_fields" });
      const typed = data.confirmation.toLowerCase();
      if (typed !== user.username && typed !== user.email) {
        return res.status(400).json({ error: "server.users.errors.confirmation_incorrect" });
      }
    }

    if (await isLastAdmin(user)) return res.status(400).json({ error: "server.users.errors.last_admin" });

    await User.findByIdAndDelete(userId);
    await deleteUserData(user);

    createLog({
      message: `User '${user.username}' deleted their account`,
      userId: userId,
      level: logLevels.INFO,
    });

    clearAccessTokenCookie(res);

    res.status(200).json({ message: "server.users.messages.user_deleted" });
  } catch (err) {
    handleServerError(res, err);
  }
};

/** * @function getAuthTypesStat
 * @description Retrieves statistics on the number of users per authentication type.
 * @returns {Object} JSON response with statistics formatted for chart display.
 */
export const getAuthTypesStat = async (req, res) => {
  try {
    const data = await Promise.all(
      Object.values(authTypes).map(async (type) => ({
        label: type.charAt(0).toUpperCase() + type.slice(1), // ex: "google" -> "Google"
        value: await User.countDocuments({ auth_type: type }),
      })),
    );

    res.status(200).json({ data });
  } catch (err) {
    handleServerError(res, err);
  }
};
