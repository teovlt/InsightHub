import { User } from "../models/userModel.js";
import bcrypt from "bcryptjs";
import { Constants } from "../../constants/constants.js";
import { createLog } from "./logController.js";
import { logLevels } from "../utils/enums/logLevel.js";
import { userRoles } from "../utils/enums/userRoles.js";
import { authTypes } from "../utils/enums/authTypes.js";
import { saveAvatarFromUrl } from "../utils/saveAvatarFromUrl.js";
import { generateRandomAvatar } from "../utils/generateRandomAvatar.js";
import { clearAccessTokenCookie, setAccessTokenCookie } from "../utils/authCookie.js";
import { verifyGoogleIdToken } from "../utils/googleAuth.js";
import { handleServerError } from "../utils/httpErrors.js";
import { toPublicUser } from "../utils/userData.js";
import { parseBody } from "../middlewares/validate.js";
import { googleLoginSchema, loginSchema, registerSchema } from "../validation/schemas.js";

// Compared against when the user does not exist, so both failure paths take the same time
const DUMMY_PASSWORD_HASH = bcrypt.hashSync("insighthub-dummy-password", 10);

/**
 * Registers a new user.
 * When an idToken is provided, the account is a Google one: the token is verified and must match the email.
 *
 * @param {Object} userData - Data for the user registration.
 * @param {string} userData.email - User's email address.
 * @param {string} userData.username - User's username.
 * @param {string} userData.password - User's password.
 * @param {string} userData.confirmPassword - Confirmation of user's password.
 * @param {string} [userData.idToken] - Firebase ID token for a Google registration.
 * @returns {Object} JSON response with user details or error message.
 */
export const register = async (req, res) => {
  const { data, status, error } = parseBody(registerSchema, req.body);
  if (error) return res.status(status).json(error);

  const { name, forename, email, username, password, confirmPassword, idToken } = data;

  if (!Constants.REGEX_PASSWORD.test(password)) {
    return res.status(400).json({
      error: "server.auth.errors.regex",
    });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ error: "server.auth.errors.password_no_match" });
  }

  try {
    let googleProfile = null;
    if (idToken) {
      googleProfile = await verifyGoogleIdToken(idToken);
      if (!googleProfile || googleProfile.email !== email.toLowerCase()) {
        return res.status(401).json({ error: "server.auth.errors.google_token_invalid" });
      }
    }

    if (await User.findOne({ email: email.toLowerCase() })) {
      return res.status(409).json({ error: "server.auth.errors.email_taken" });
    } else if (await User.findOne({ username: username.toLowerCase() })) {
      return res.status(409).json({ error: "server.auth.errors.username_taken" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      email: email.toLowerCase(),
      username: username.toLowerCase(),
      password: hashedPassword,
      name,
      forename,
      auth_type: googleProfile ? authTypes.GOOGLE : authTypes.LOCAL,
    });

    try {
      user.avatar = googleProfile?.picture
        ? await saveAvatarFromUrl(googleProfile.picture, user._id)
        : await saveAvatarFromUrl(generateRandomAvatar(user.username), user._id, "svg");
      await user.save();
    } catch (err) {
      console.error("Failed to upload avatar to Firebase:", err.message);
    }

    const userCount = await User.countDocuments();
    if (userCount === 1) {
      user.role = userRoles.ADMIN;
      await user.save();
    }

    setAccessTokenCookie(res, user);

    createLog({
      message: `New user ${user.username} registered successfully`,
      userId: user._id,
      level: logLevels.INFO,
    });

    res.status(201).json({ user: toPublicUser(user), message: "server.auth.messages.register_success" });
  } catch (err) {
    return handleServerError(res, err);
  }
};

/**
 * Logs in a user.
 *
 * @param {Object} credentials - Login credentials.
 * @param {string} credentials.username - User's username.
 * @param {string} credentials.password - User's password.
 * @returns {Object} JSON response with user details or error message.
 */
export const login = async (req, res) => {
  const { data, status, error } = parseBody(loginSchema, req.body);
  if (error) return res.status(status).json(error);

  const { username, password, email } = data;

  if (!password || (!username && !email)) {
    return res.status(422).json({ error: "server.global.errors.missing_fields" });
  }

  try {
    const user = await User.findOne({
      $or: [...(username ? [{ username: username.toLowerCase() }] : []), ...(email ? [{ email: email.toLowerCase() }] : [])],
    }).select("+password +tokenVersion");

    // Same answer whether the account exists or not, to avoid user enumeration
    const isMatch = await bcrypt.compare(password, user?.password ?? DUMMY_PASSWORD_HASH);
    if (!user || !isMatch) {
      if (user) {
        createLog({
          message: `Invalid credentials while trying to login`,
          userId: user._id,
          level: logLevels.ERROR,
        });
      }
      return res.status(400).json({ error: "server.auth.errors.invalid_credentials" });
    }

    setAccessTokenCookie(res, user);

    res.status(200).json({ user: toPublicUser(user), message: "server.auth.messages.login_success" });
  } catch (err) {
    return handleServerError(res, err);
  }
};

/**
 * Logs out a user by clearing the access token cookie.
 *
 * @returns {Object} JSON response with success message.
 */
export const logout = async (req, res) => {
  clearAccessTokenCookie(res);
  res.status(200).json({ message: "server.auth.messages.logout_success" });
};

/**
 * Logs the user out of every device: bumping tokenVersion revokes all the tokens issued so far.
 *
 * @returns {Object} JSON response with success message.
 */
export const logoutEverywhere = async (req, res) => {
  try {
    await User.updateOne({ _id: req.userId }, { $inc: { tokenVersion: 1 } });

    createLog({
      message: `User ${req.user.username} logged out of every device`,
      userId: req.userId,
      level: logLevels.INFO,
    });

    clearAccessTokenCookie(res);
    res.status(200).json({ message: "server.auth.messages.logout_everywhere_success" });
  } catch (err) {
    return handleServerError(res, err);
  }
};

/**
 * Retrieves the currently connected user's details.
 *
 * @param {string} userId - The ID of the connected user, extracted from the token.
 * @returns {Object} JSON response with user details or error message.
 */
export const getConnectedUser = async (req, res) => {
  res.status(200).json(toPublicUser(req.user));
};

/**
 * Signs in a user using Google: the Firebase ID token is verified server-side and the email is read from it.
 *
 * @param {Object} req - Request object containing the Firebase ID token.
 * @param {Object} res - Response object to send the result.
 * @returns {Object} JSON response with user details or error message.
 */
export const signInWithGoogle = async (req, res) => {
  const { data, status, error } = parseBody(googleLoginSchema, req.body);
  if (error) return res.status(status).json(error);

  try {
    const profile = await verifyGoogleIdToken(data.idToken);
    if (!profile) {
      return res.status(401).json({ error: "server.auth.errors.google_token_invalid" });
    }

    const user = await User.findOne({ email: profile.email }).select("+tokenVersion");
    if (!user) {
      // Do not change the error message, this is intentional to redirect to register
      return res.status(404).json({ error: "User not found, lets register !" });
    }

    setAccessTokenCookie(res, user);

    return res.status(200).json({ user: toPublicUser(user), message: "server.auth.messages.login_success" });
  } catch (err) {
    return handleServerError(res, err);
  }
};
