import express from "express";

import "dotenv/config";
import cors from "cors";
import cookieParser from "cookie-parser";

import { corsOptions } from "./configuration/corsOptions.js";
import { router } from "./routes/router.js";

import session from "express-session";
import MongoStore from "connect-mongo"; // ou Redis, pareil

// Create the Express application instance
export const app = express();

// Global middleware
app.use(express.json()); // Parse incoming JSON payloads
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded payloads

// Log each incoming request (method and path)
app.use((req, res, next) => {
  console.log(req.path, req.method);
  next();
});

// Enable CORS with predefined options
app.use(cors(corsOptions));

// Parse cookies from incoming requests
app.use(cookieParser());

app.set("trust proxy", 1);
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONG_URI }),
    cookie: {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24, // 1 day
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      secure: process.env.NODE_ENV === "production",
    },
  }),
);

// Register main application routes
app.use(router);
// Self-ping toutes les 14 minutes (render-proof)
setInterval(
  async () => {
    try {
      const res = await fetch(process.env.SELF_URL + "/api/ping");
      console.log(`Self-ping status: ${res.status}`);
    } catch (err) {
      console.error("Self-ping failed:", err);
    }
  },
  14 * 60 * 1000,
);
