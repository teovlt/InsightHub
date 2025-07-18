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
    accessToken: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

IntegrationUserSchema.index({ userId: 1, integrationId: 1 }, { unique: true });

export const IntegrationUser = model("IntegrationUser", IntegrationUserSchema);
