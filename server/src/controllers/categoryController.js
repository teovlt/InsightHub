import { Category } from "../models/categoryModel.js";
import { IntegrationUser } from "../models/integrationUser.js";
import { Stat } from "../models/statModel.js";
import { autoSyncStats } from "../utils/stats.js";
import { handleServerError } from "../utils/httpErrors.js";
import { getPagination } from "../utils/pagination.js";

/**
 * Get a paginated list of categories.
 *
 * @returns {Object} JSON response with categories and total count.
 */
export const getCategories = async (req, res) => {
  const { size, skip } = getPagination(req.query);
  const userId = req.userId;

  try {
    const categories = await Category.find({}).sort({ order: 1, createdAt: 1 }).skip(skip).limit(size).lean();

    const categoryIds = categories.map((cat) => cat._id);

    // Refresh connected integrations first (throttled by SYNC_INTERVAL) so the page shows up-to-date values
    const connections = await IntegrationUser.find({ userId, connected: true }).select("integrationId").lean();
    await Promise.all(connections.map((connection) => autoSyncStats(userId, connection.integrationId)));

    let stats = await Stat.find({
      userId: userId,
      categoryId: { $in: categoryIds },
      current: true,
    }).lean();

    const integrationUsers = await IntegrationUser.find({ userId }).lean();

    const activedStatMap = {};
    integrationUsers.forEach((iu) => {
      if (iu.integrationId && Array.isArray(iu.activedStat)) {
        activedStatMap[iu.integrationId.toString()] = iu.activedStat.map((id) => id.toString());
      }
    });

    stats = stats.filter((stat) => {
      if (!stat.integrationId) return true; // Stat locale, pas concernée
      const activedIds = activedStatMap[stat.integrationId.toString()] || [];
      return activedIds.includes(stat.integrationStatId?.toString());
    });

    const statsByCategory = {};
    stats.forEach((stat) => {
      const catId = stat.categoryId.toString();
      if (!statsByCategory[catId]) statsByCategory[catId] = [];
      statsByCategory[catId].push(stat);
    });

    const categoriesWithStats = categories.map((cat) => ({
      ...cat,
      stats: statsByCategory[cat._id.toString()] || [],
    }));

    const count = await Category.countDocuments();

    res.status(200).json({ categories: categoriesWithStats, count });
  } catch (err) {
    handleServerError(res, err);
  }
};

/**
 * Create a new category.
 *
 * @param {Object} req - The request object containing category data.
 * @param {Object} res - The response object to send the result.
 * @returns {Object} JSON response with created category or error.
 */
export const createCategory = async (req, res) => {
  const { name, description, icon, color } = req.body;

  try {
    const categories = await Category.find({}).sort({ order: 1 });

    const category = await Category.create({
      name,
      description,
      icon,
      color,
      order: categories.length > 0 ? categories[categories.length - 1].order + 1 : 0,
    });

    res.status(201).json({ category, message: "Category created successfully" });
  } catch (err) {
    handleServerError(res, err);
  }
};

/**
 * Update a specific category by ID.
 *
 * @returns {Object} JSON response with updated category or error.
 */
export const updateCategory = async (req, res) => {
  const { id } = req.params;

  try {
    // req.body only holds the validated fields that were sent
    const updatedCategory = await Category.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });

    if (!updatedCategory) {
      return res.status(400).json({ error: "No such category" });
    }

    res.status(200).json({ message: "Category updated successfully", category: updatedCategory });
  } catch (err) {
    handleServerError(res, err);
  }
};

/**
 * Delete a specific category by ID.
 *
 * @returns {Object} JSON response with success or error.
 */
export const deleteCategory = async (req, res) => {
  const { id } = req.params;

  try {
    const category = await Category.findByIdAndDelete(id);
    if (!category) {
      return res.status(400).json({ error: "No such category" });
    }
    // Stats cannot exist without their category
    await Stat.deleteMany({ categoryId: category._id });
    res.status(200).json({ message: "Category deleted successfully" });
  } catch (err) {
    handleServerError(res, err);
  }
};

/**
 * Delete all categories.
 *
 * @returns {Object} JSON response with success or error.
 */
export const deleteAllCategories = async (req, res) => {
  try {
    await Category.deleteMany();
    await Stat.deleteMany();
    res.status(200).json({ message: "All categories deleted successfully" });
  } catch (err) {
    handleServerError(res, err);
  }
};
