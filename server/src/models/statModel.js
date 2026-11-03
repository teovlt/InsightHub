import mongoose from "mongoose";
import { parseStatValue } from "../utils/statValue.js";

const statSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    value: {
      type: String,
      required: true,
    },
    unit: {
      type: String,
    },
    current: {
      type: Boolean,
      default: true,
    },
    hided: {
      type: Boolean,
      default: false,
    },
    integrationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Integration",
      required: false,
    },
    integrationStatId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    // Derived from value on save (see parseStatValue): lets the client chart and compare values
    type: {
      type: String,
      enum: ["number", "duration", "text"],
      default: "text",
    },
    numericValue: {
      type: Number,
      default: null,
    },
    // Shown at the top of the dashboard. Pin and goal are copied on every version of the stat.
    pinned: {
      type: Boolean,
      default: false,
    },
    goal: {
      target: { type: Number },
      deadline: { type: Date },
      // "decrease" for stats where lower is better (weight, a run time). See utils/goals.js
      direction: { type: String, enum: ["increase", "decrease"] },
      // Value when the goal was set: progress of a "decrease" goal is measured from it
      start: { type: Number },
    },
  },
  {
    timestamps: true,
  },
);

statSchema.pre("save", function (next) {
  if (this.isModified("value") || this.isNew) {
    const { type, numericValue } = parseStatValue(this.value);
    this.type = type;
    this.numericValue = numericValue;
  }
  next();
});

export const Stat = mongoose.model("Stat", statSchema);
