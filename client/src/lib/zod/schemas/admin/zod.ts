import { z } from "zod";

export const createPlayerSchema = z.object({
  name: z
    .string()
    .min(2, { message: "Name must be at least 2 characters long" })
    .max(25, { message: "Name must be at most 25 characters long" }),
  forename: z
    .string()
    .min(2, { message: "Forename must be at least 2 characters long" })
    .max(25, { message: "Forename must be at most 25 characters long" }),
  username: z
    .string()
    .min(2, { message: "Username must be at least 2 characters long" })
    .max(25, { message: "Username must be at most 25 characters long" })
    .regex(/^[^A-Z\s]+$/, { message: "Username cannot contain spaces or uppercases" }),
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(1, { message: "Password is required" }).max(255, { message: "Password must be at most 255 characters long" }),
  role: z.string(),
});

export const updatePlayerSchema = z.object({
  name: z
    .string()
    .min(2, { message: "Name must be at least 2 characters long" })
    .max(25, { message: "Name must be at most 25 characters long" }),
  forename: z
    .string()
    .min(2, { message: "Forename must be at least 2 characters long" })
    .max(25, { message: "Forename must be at most 25 characters long" }),
  username: z
    .string()
    .min(2, { message: "Username must be at least 2 characters long" })
    .max(25, { message: "Username must be at most 25 characters long" })
    .regex(/^[^A-Z\s]+$/, { message: "Username cannot contain spaces or uppercases" }),
  email: z.string().email({ message: "Invalid email address" }),
  role: z.string(),
  password: z.string().max(255, { message: "Password must be at most 255 characters long" }).optional(),
});

export const deleteInfoSchema = z.object({
  confirmDelete: z
    .string()
    .min(1, { message: "You must type something" })
    .transform((val) => val.toUpperCase()),
});

export const createCategorySchema = z.object({
  name: z
    .string()
    .min(2, { message: "Name must be at least 2 characters long" })
    .max(100, { message: "Name must be at most 100 characters long" }),
  description: z
    .string()
    .min(2, { message: "Description must be at least 2 characters long" })
    .max(500, { message: "Description must be at most 500 characters long" }),
  icon: z.string().min(1, { message: "Icon is required" }),
  color: z.string().min(1, { message: "Color is required" }),
});

export const updateCategorySchema = z.object({
  name: z
    .string()
    .min(2, { message: "Name must be at least 2 characters long" })
    .max(100, { message: "Name must be at most 100 characters long" }),
  description: z
    .string()
    .min(2, { message: "Description must be at least 2 characters long" })
    .max(500, { message: "Description must be at most 500 characters long" }),
  icon: z.string().min(1, { message: "Icon is required" }),
  color: z.string().min(1, { message: "Color is required" }),
  order: z.number().optional().describe("Order of the category, used for sorting"),
});

export const integrationSchema = z.object({
  name: z
    .string()
    .min(2, { message: "Name must be at least 2 characters long" })
    .max(100, { message: "Name must be at most 100 characters long" }),
  description: z.string(),
  icon: z.string(),
  color: z.string(),
  category: z.string(),
  status: z.enum(["available", "disabled", "deprecated"]),
  availableStats: z
    .array(
      z.object({
        id: z.string().min(1, { message: "ID is required" }),
        name: z.string().min(1, { message: "Name is required" }),
        description: z.string().optional(),
        unit: z.string().optional(),
        category: z.string().optional(),
        updateFrequency: z.enum(["real-time", "hourly", "daily", "weekly"]),
        dataType: z.enum(["number", "string", "boolean"]),
        icon: z.string().optional(),
      }),
    )
    .optional(),
  config: z
    .object({
      authUrl: z.string(),
      docsUrl: z.string(),
    })
    .optional(),
});
