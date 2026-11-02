import { Constants } from "../../constants/constants.js";
import { generateAccessToken } from "./generateAccessToken.js";

export const ACCESS_TOKEN_COOKIE = "__access__token";

/**
 * @function getCookieOptions
 * @description Builds the options shared by the auth and session cookies.
 * SameSite defaults to "lax" (client and API served from the same site); set COOKIE_SAMESITE=none
 * only when they live on different sites, which also forces the Secure flag.
 * @returns {Object} Cookie options for express.
 */
export const getCookieOptions = () => {
  const sameSite = (process.env.COOKIE_SAMESITE || "lax").toLowerCase();
  return {
    httpOnly: true,
    sameSite,
    secure: sameSite === "none" || process.env.NODE_ENV === "production",
    path: "/",
  };
};

/**
 * @function setAccessTokenCookie
 * @description Signs a JWT for the user and stores it in an httpOnly cookie.
 * @param {Object} res - Express response.
 * @param {Object} user - User document (needs _id and tokenVersion).
 */
export const setAccessTokenCookie = (res, user) => {
  const token = generateAccessToken(user._id, user.tokenVersion ?? 0);
  res.cookie(ACCESS_TOKEN_COOKIE, token, { ...getCookieOptions(), maxAge: Constants.MAX_AGE * 1000 });
};

/**
 * @function clearAccessTokenCookie
 * @description Removes the auth cookie from the browser.
 * @param {Object} res - Express response.
 */
export const clearAccessTokenCookie = (res) => {
  res.clearCookie(ACCESS_TOKEN_COOKIE, getCookieOptions());
};

/**
 * @function readCookie
 * @description Reads a cookie value from a raw Cookie header (used by Socket.IO, which has no cookie-parser).
 * @param {string} header - Raw Cookie header.
 * @param {string} name - Cookie name.
 * @returns {string|undefined} The decoded cookie value.
 */
export const readCookie = (header = "", name) => {
  const entry = header
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  if (!entry) return undefined;
  try {
    return decodeURIComponent(entry.slice(name.length + 1));
  } catch {
    return undefined;
  }
};
