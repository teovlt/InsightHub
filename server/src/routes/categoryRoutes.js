import express from "express";
import { verifyToken } from "../middlewares/verifyToken.js";
import { createCategory, deleteAllCategories, deleteCategory, getCategories, updateCategory } from "../controllers/categoryController.js";

export const categoryRouter = new express.Router();

/**
 * @route GET /
 * @description Retrieves all the categories.
 * @middleware verifyToken({ role: "admin" }) - Ensures the user is authenticated and has the 'admin' role.
 */
categoryRouter.get("/", verifyToken(), getCategories);

/**
 * @route POST /
 * @description Creates a new category.
 * @middleware verifyToken({ role: "admin" }) - Ensures the user is authenticated and has the 'admin' role.
 * @param {Object} categoryData - The data for the new category.
 */
categoryRouter.post("/", verifyToken({ role: "admin" }), createCategory);

/** * @route PUT /:id
 * @description Updates a specific category by ID.
 * @param {string} id - The ID of the category to update.
 * @param {Object} categoryData - The data to update the category with.
 * @middleware verifyToken({ role: "admin" }) - Ensures the user is authenticated and has the 'admin' role.
 */
categoryRouter.put("/:id", verifyToken({ role: "admin" }), updateCategory);

/**
 * @route DELETE /:id
 * @description Deletes a specific category by ID.
 * @param {string} id - The ID of the category to delete.
 * @middleware verifyToken({ role: "admin" }) - Ensures the user is authenticated and has the 'admin' role.
 */
categoryRouter.delete("/:id", verifyToken({ role: "admin" }), deleteCategory);

/**
 * @route DELETE /
 * @description Deletes all categories.
 * @middleware verifyToken({ role: "admin" }) - Ensures the user is authenticated and has the 'admin' role.
 */
categoryRouter.delete("/", verifyToken({ role: "admin" }), deleteAllCategories);
