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
    // Key of the provider in src/integrations that fetches this integration's stats
    provider: {
      type: String,
      index: { unique: true, sparse: true },
    },
    authType: {
      type: String,
      enum: ["oauth", "username", "apiKey"],
      default: "oauth",
    },
    // What the user types to connect a "username" or "apiKey" integration, and where to find it
    credentialLabel: { type: String },
    credentialHelp: { type: String },
    // Example shown in the empty field, and the steps to get the credential, shown in the connect dialog
    credentialPlaceholder: { type: String },
    credentialSteps: [{ type: String }],
    // Disabled at startup because a server key is missing (see ensureProviderIntegrations)
    autoDisabled: { type: Boolean, default: false },
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
