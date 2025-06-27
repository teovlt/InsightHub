import mongoose from "mongoose";

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
  },
  {
    timestamps: true,
  },
);

export const Stat = mongoose.model("Stat", statSchema);
