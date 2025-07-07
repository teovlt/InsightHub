import mongoose from "mongoose";

const { Schema, model } = mongoose;

const IntegrationSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
    },
    icon: {
      type: String,
    },
    color: {
      type: String,
    },
    category: {
      type: String,
    },
    status: {
      type: String,
      enum: ["available", "disabled", "deprecated"],
      default: "available",
    },
    availableStats: [
      {
        id: { type: String, required: true },
        name: { type: String, required: true },
        description: { type: String },
        unit: { type: String },
        category: { type: String },
        updateFrequency: {
          type: String,
          enum: ["real-time", "hourly", "daily", "weekly"],
          default: "daily",
        },
        dataType: {
          type: String,
          enum: ["number", "string", "boolean"],
          required: true,
        },
        icon: { type: String },
      },
    ],
    config: {
      clientId: { type: String, select: false },
      clientSecret: { type: String, select: false },
      authUrl: { type: String },
      docsUrl: { type: String },
    },
  },
  {
    timestamps: true,
  },
);

export const Integration = model("Integration", IntegrationSchema);
