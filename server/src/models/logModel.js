import mongoose from "mongoose";
import { logLevels } from "../utils/enums/logLevel.js";

const LogSchema = new mongoose.Schema(
  {
    message: {
      type: String,
      required: true,
    },
    level: {
      type: String,
      enum: Object.values(logLevels),
      required: true,
      default: logLevels.INFO,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  },
);

// MongoDB removes logs older than 90 days on its own
export const LOG_RETENTION_SECONDS = 90 * 24 * 60 * 60;
LogSchema.index({ createdAt: 1 }, { expireAfterSeconds: LOG_RETENTION_SECONDS });

export const Log = mongoose.model("Log", LogSchema);
