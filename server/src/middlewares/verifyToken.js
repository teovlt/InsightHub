import jwt from "jsonwebtoken";
import { User } from "../models/userModel.js";
import { createLog } from "../controllers/logController.js";
import { logLevels } from "../utils/enums/logLevel.js";
import { ACCESS_TOKEN_COOKIE } from "../utils/authCookie.js";
import { handleServerError } from "../utils/httpErrors.js";

/**
 * @function authenticateToken
 * @description Verifies a JWT and loads the matching user, rejecting tokens revoked through tokenVersion.
 * @param {string} token - The raw JWT.
 * @returns {Promise<Object|null>} The user (with role and tokenVersion), or null if the token is not valid.
 */
export const authenticateToken = async (token) => {
  let payload;
  try {
    payload = jwt.verify(token, process.env.SECRET_ACCESS_TOKEN);
  } catch {
    return null;
  }

  const user = await User.findById(payload.id).select("+tokenVersion");
  if (!user || (payload.v ?? 0) !== (user.tokenVersion ?? 0)) return null;
  return user;
};

/**
 * Middleware to verify the JWT stored in the httpOnly auth cookie and, if specified, check the user's role.
 * On success, req.userId (string) and req.user are set.
 *
 * @param {Object} options - Options for the middleware.
 * @param {string} [options.role] - Required role to access the route (e.g., "admin").
 * @returns {Function} Express middleware function that verifies the token and checks the user's role.
 */
export const verifyToken = ({ role } = {}) => {
  return async (req, res, next) => {
    const token = req.cookies?.[ACCESS_TOKEN_COOKIE];
    if (!token) return res.status(401).json({ error: "Not Authenticated" });

    try {
      const user = await authenticateToken(token);
      if (!user) return res.status(401).json({ error: "Access Token is invalid" });

      req.userId = user._id.toString();
      req.user = user;

      if (role && user.role !== role) {
        createLog({
          message: `User ${user.username} attempted to access a restricted route`,
          userId: user._id,
          level: logLevels.ERROR,
        });
        return res.status(403).json({ error: "Access restricted" });
      }
    } catch (error) {
      return handleServerError(res, error);
    }

    next();
  };
};
