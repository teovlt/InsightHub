import { rateLimit } from "express-rate-limit";

const createLimiter = ({ windowMs, limit }) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    // Disabled in tests, which fire many requests from the same address
    skip: () => process.env.NODE_ENV === "test",
    message: { error: "server.global.errors.too_many_requests" },
  });

/**
 * Brute-force protection for credential checks (login, Google login, password change, account deletion).
 */
export const credentialsLimiter = createLimiter({ windowMs: 15 * 60 * 1000, limit: 10 });

/**
 * Throttles account creation from a single address.
 */
export const registerLimiter = createLimiter({ windowMs: 60 * 60 * 1000, limit: 10 });

/**
 * Global safety net for the whole API.
 */
export const apiLimiter = createLimiter({ windowMs: 60 * 1000, limit: 300 });
