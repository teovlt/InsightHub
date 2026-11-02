import express from "express";
import { getConnectedUser, login, logout, register, signInWithGoogle } from "../controllers/authenticationController.js";
import { verifyToken } from "../middlewares/verifyToken.js";
import { credentialsLimiter, registerLimiter } from "../middlewares/rateLimiters.js";

export const authRouter = new express.Router();

/**
 * @route POST /login
 * @description Authenticates a user with their credentials (e.g., email and password).
 */
authRouter.post("/login", credentialsLimiter, login);

/**
 * @route POST /google
 * @description Authenticates a user using Google OAuth.
 * @body {Object} - Contains the Firebase ID token ({ idToken }), verified server-side.
 */
authRouter.post("/login/google", credentialsLimiter, signInWithGoogle);

/**
 * @route POST /register
 * @description Registers a new user with the provided details.
 */
authRouter.post("/register", registerLimiter, register);

/**
 * @route POST /logout
 * @description Logs out the current user by clearing the auth cookie (works even with an expired token).
 */
authRouter.post("/logout", logout);

/**
 * @route GET /me
 * @description Fetches the currently authenticated user's information.
 * @middleware verifyToken() - Ensures the user is authenticated by validating the JWT token.
 */
authRouter.get("/me", verifyToken(), getConnectedUser);
