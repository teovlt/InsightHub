import { Category } from "../models/categoryModel.js";
import { IntegrationUser } from "../models/integrationUser.js";
import { Stat } from "../models/statModel.js";

/**
 * Get a paginated list of categories.
 *
 * @returns {Object} JSON response with categories and total count.
 */
export const getCategories = async (req, res) => {
  const size = parseInt(req.query.size) || 10;
  const page = parseInt(req.query.page) || 0;
  const userId = req.userId;

  try {
    // 1️⃣ Récupère les catégories paginées
    const categories = await Category.find({})
      .sort({ order: 1, createdAt: 1 })
      .skip(page * size)
      .limit(size)
      .lean();

    const categoryIds = categories.map((cat) => cat._id);

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
    res.status(500).json({ error: err.message });
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

  if (!name || !description || !icon || !color) {
    return res.status(400).json({ error: "Missing fields" });
  }

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
    res.status(500).json({ error: err.message });
  }
};

/**
 * Update a specific category by ID.
 *
 * @returns {Object} JSON response with updated category or error.
 */
export const updateCategory = async (req, res) => {
  const { id } = req.params;
  const { name, description, icon, color, order } = req.body;

  try {
    const updatedCategory = await Category.findByIdAndUpdate(
      id,
      { name, description, icon, color, order },
      { new: true, runValidators: true },
    );

    if (!updatedCategory) {
      return res.status(400).json({ error: "No such category" });
    }

    res.status(200).json({ message: "Category updated successfully", category: updatedCategory });
  } catch (err) {
    res.status(500).json({ error: err.message });
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
    res.status(200).json({ message: "Category deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
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
    res.status(200).json({ message: "All categories deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
