import mongoose from "mongoose";
import { z } from "zod";
import { userRoles } from "../utils/enums/userRoles.js";

const objectId = z.string().refine((value) => mongoose.isValidObjectId(value), { message: "Invalid id" });
const trimmed = (max) => z.string().trim().min(1).max(max);
const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const role = z.enum(Object.values(userRoles));

// Unknown keys are stripped by z.object, which is what prevents mass assignment on every validated route.

export const registerSchema = z.object({
  name: trimmed(50),
  forename: trimmed(50),
  username: trimmed(30),
  email: z.string().trim().email().max(254),
  password: z.string().max(255),
  confirmPassword: z.string().max(255),
  idToken: z.string().max(4096).optional(),
});

export const loginSchema = z.object({
  username: trimmed(254).optional(),
  email: trimmed(254).optional(),
  password: z.string().max(255),
});

export const googleLoginSchema = z.object({
  idToken: z.string().min(1).max(4096),
});

export const selfUpdateUserSchema = z.object({
  name: trimmed(50).optional(),
  forename: trimmed(50).optional(),
  username: trimmed(30).optional(),
  email: z.string().trim().email().max(254).optional(),
});

export const adminUpdateUserSchema = selfUpdateUserSchema.extend({
  role: role.optional(),
  password: z.string().max(255).optional(),
});

export const createUserSchema = z.object({
  name: trimmed(50),
  forename: trimmed(50),
  username: trimmed(30),
  email: z.string().trim().email().max(254),
  password: z.string().max(255),
  role: role.optional(),
});

export const updatePasswordSchema = z.object({
  currentPassword: z.string().max(255),
  newPassword: z.string().max(255),
  newPasswordConfirm: z.string().max(255),
});

export const deleteAccountSchema = z.object({
  password: z.string().max(255),
});

const statValue = z.union([z.string().trim().min(1).max(100), z.number()]).transform(String);

export const createStatSchema = z.object({
  name: trimmed(100),
  description: z.string().max(500).optional(),
  value: statValue,
  unit: z.string().max(30).optional(),
  categoryId: objectId,
  hided: z.boolean().optional(),
});

export const updateStatSchema = z.object({
  name: trimmed(100).optional(),
  description: z.string().max(500).optional(),
  value: statValue,
  unit: z.string().max(30).optional(),
  categoryId: objectId.optional(),
  hided: z.boolean().optional(),
});

export const createCategorySchema = z.object({
  name: trimmed(100),
  description: trimmed(500),
  icon: trimmed(50),
  color: hexColor,
});

export const updateCategorySchema = createCategorySchema.partial().extend({
  order: z.number().int().min(0).optional(),
});

const integrationStatSchema = z.object({
  // Kept so existing stats keep their _id: users' activated stats reference it
  _id: objectId.optional(),
  id: trimmed(100),
  name: trimmed(100),
  description: z.string().max(500).optional(),
  unit: z.string().max(30).optional(),
  category: z.string().max(100).optional(),
  updateFrequency: z.enum(["real-time", "hourly", "daily", "weekly"]).optional(),
  dataType: z.enum(["number", "string", "boolean"]),
  icon: z.string().max(50).optional(),
});

export const integrationSchema = z.object({
  name: trimmed(100),
  description: z.string().max(500).optional(),
  icon: z.string().max(50).optional(),
  color: z.string().max(20).optional(),
  category: z.string().max(100).optional(),
  status: z.enum(["available", "disabled", "deprecated"]).optional(),
  availableStats: z.array(integrationStatSchema).max(50).optional(),
  config: z
    .object({
      authUrl: z.string().max(200).optional(),
      docsUrl: z.string().max(500).optional(),
    })
    .optional(),
});

export const updateConfigSchema = z.object({
  keys: z.array(trimmed(100)).max(50),
  config: z.record(z.string().max(1000)),
});
