import mongoose from "mongoose";
import { userRoles } from "../utils/enums/userRoles.js";
import { authTypes } from "../utils/enums/authTypes.js";

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    forename: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    // Google accounts sign in with their Google ID token and have no password
    password: {
      type: String,
      required: function () {
        return this.auth_type !== authTypes.GOOGLE;
      },
      select: false,
    },
    role: {
      type: String,
      default: userRoles.USER,
    },
    avatar: {
      type: String,
      default: "",
    },
    auth_type: {
      type: String,
      default: authTypes.LOCAL,
    },
    // Incremented to revoke every JWT issued before (password change, logout everywhere)
    tokenVersion: {
      type: Number,
      default: 0,
      select: false,
    },
  },
  {
    timestamps: true,
  },
);

// Virtual field for full name (combines 'name' and 'forename')
UserSchema.virtual("fullname").get(function () {
  const formattedforename = this.forename.charAt(0).toUpperCase() + this.forename.slice(1).toLowerCase();
  return `${this.name} ${formattedforename}`;
});

export const User = mongoose.model("User", UserSchema);
