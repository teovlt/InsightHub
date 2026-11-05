import mongoose from "mongoose";

const { Schema, model, Types } = mongoose;

const IntegrationUserSchema = new Schema(
  {
    userId: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    integrationId: {
      type: Types.ObjectId,
      ref: "Integration",
      required: true,
      index: true,
    },
    connected: {
      type: Boolean,
      default: true,
    },
    activedStat: [
      {
        type: Types.ObjectId,
        ref: "IntegrationStat",
        required: true,
      },
    ],
    config: {
      type: Schema.Types.Mixed,
      default: {},
    },
    // Encrypted with utils/crypto.js; removed when the user disconnects
    accessToken: {
      type: String,
    },
    // Last successful sync, used to throttle automatic syncs
    lastSyncedAt: {
      type: Date,
    },
    // Last background sync attempt, successful or not: a failing service is retried later, not on every tick
    lastSyncAttemptAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

IntegrationUserSchema.index({ userId: 1, integrationId: 1 }, { unique: true });

export const IntegrationUser = model("IntegrationUser", IntegrationUserSchema);
