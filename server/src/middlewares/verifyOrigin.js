const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Middleware protecting cookie-authenticated routes against CSRF.
 * Browsers always send an Origin header on cross-origin state-changing requests, so any
 * mutating request whose Origin is not the configured client origin is rejected.
 * Requests without an Origin (server-to-server, tests, curl) carry no ambient browser cookies and are allowed.
 */
export const verifyOrigin = (req, res, next) => {
  if (SAFE_METHODS.has(req.method)) return next();

  const origin = req.headers.origin;
  if (!origin) return next();

  const allowedOrigins = (process.env.CORS_ORIGIN || "").split(",").map((o) => o.trim());
  if (allowedOrigins.includes(origin)) return next();

  return res.status(403).json({ error: "server.global.errors.forbidden" });
};
