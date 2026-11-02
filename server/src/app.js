import express from "express";

import "dotenv/config";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import multer from "multer";

import { corsOptions } from "./configuration/corsOptions.js";
import { UploadError } from "./configuration/storageConfig.js";
import { router } from "./routes/router.js";
import { verifyOrigin } from "./middlewares/verifyOrigin.js";
import { apiLimiter } from "./middlewares/rateLimiters.js";
import { getCookieOptions } from "./utils/authCookie.js";

import session from "express-session";
import MongoStore from "connect-mongo";

// Create the Express application instance
export const app = express();

app.set("trust proxy", 1);

// Security headers; uploaded avatars must stay embeddable by the client origin
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

// Global middleware
app.use(express.json({ limit: "100kb" })); // Parse incoming JSON payloads
app.use(express.urlencoded({ extended: true, limit: "100kb" })); // Parse URL-encoded payloads

// Enable CORS with predefined options
app.use(cors(corsOptions));

// Reject cross-site state-changing requests (CSRF) and throttle the API
app.use("/api", verifyOrigin, apiLimiter);

// Parse cookies from incoming requests
app.use(cookieParser());

// Session only carries the short-lived OAuth state between the redirect and the callback
app.use(
  session({
    name: "ih.sid",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONG_URI }),
    cookie: {
      ...getCookieOptions(),
      maxAge: 1000 * 60 * 15, // 15 minutes
    },
  }),
);

// Register main application routes
app.use(router);

// Errors raised by middlewares (body parsing, uploads) or passed to next()
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err instanceof UploadError) {
    return res.status(400).json({ error: err.message });
  }
  if (err instanceof multer.MulterError) {
    const key = err.code === "LIMIT_FILE_SIZE" ? "server.upload.errors.limit" : "server.upload.errors.invalid_file_type";
    return res.status(400).json({ error: key });
  }
  if (err.type === "entity.parse.failed" || err.type === "entity.too.large") {
    return res.status(400).json({ error: "server.global.errors.invalid_fields" });
  }

  console.error(err);
  return res.status(500).json({ error: "server.global.errors.internal" });
});
