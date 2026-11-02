import { vi } from "vitest";
import { firebaseAuth } from "../src/lib/firebase.js";
import { generateAccessToken } from "../src/utils/generateAccessToken.js";

/**
 * Builds the Cookie header authenticating a user, as the browser would send it.
 * @param {Object} user - User document.
 * @returns {string} Cookie header value.
 */
export const authCookie = (user) => `__access__token=${generateAccessToken(user._id, user.tokenVersion ?? 0)}`;

/**
 * Makes the next Firebase ID token verification succeed with the given claims.
 * @param {Object} claims - Overrides for the decoded token.
 */
export const mockGoogleToken = (claims = {}) => {
  vi.mocked(firebaseAuth.verifyIdToken).mockResolvedValueOnce({
    email: "user@gmail.com",
    email_verified: true,
    name: "Regular User",
    picture: "https://lh3.googleusercontent.com/a/photo",
    firebase: { sign_in_provider: "google.com" },
    ...claims,
  });
};

/**
 * Reads the auth cookie set by a response.
 * @param {Object} response - Supertest response.
 * @returns {string|undefined} The Set-Cookie entry for the auth cookie.
 */
export const getAuthSetCookie = (response) => (response.headers["set-cookie"] || []).find((c) => c.startsWith("__access__token="));
