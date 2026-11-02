import { firebaseAuth } from "../lib/firebase.js";

/**
 * @function verifyGoogleIdToken
 * @description Verifies a Firebase ID token issued by a Google sign-in and returns the trusted profile.
 * The email must come from this verified token, never from the request body.
 * @param {string} idToken - The Firebase ID token sent by the client.
 * @returns {Promise<{ email: string, name: string, picture?: string }|null>} The profile, or null if the token is not valid.
 */
export const verifyGoogleIdToken = async (idToken) => {
  try {
    const decoded = await firebaseAuth.verifyIdToken(idToken);
    if (!decoded.email || !decoded.email_verified || decoded.firebase?.sign_in_provider !== "google.com") {
      return null;
    }
    return { email: decoded.email.toLowerCase(), name: decoded.name || "", picture: decoded.picture };
  } catch {
    return null;
  }
};
