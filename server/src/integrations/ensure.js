import { Category } from "../models/categoryModel.js";
import { Integration } from "../models/integrationModel.js";

/**
 * @function getStatKey
 * @description Finds which provider stat an availableStat entry stands for (by id, or by name for older entries).
 * @param {Object} provider - Provider definition.
 * @param {Object} availableStat - Entry of Integration.availableStats.
 * @returns {string|null} The provider stat id, or null if the provider does not know it.
 */
export const getStatKey = (provider, availableStat) =>
  provider.stats.find((def) => def.id === availableStat.id || def.name === availableStat.name)?.id ?? null;

/**
 * @function ensureProviderStats
 * @description Adds the provider stats missing from the integration, without touching the existing entries:
 * their _id is referenced by every user's activated stats and Stat documents, so it must never change.
 * @param {string} integrationId - The integration.
 * @param {Object} provider - Provider definition.
 * @returns {Promise<Object|null>} The up-to-date integration (lean), or null if it does not exist.
 */
export const ensureProviderStats = async (integrationId, provider) => {
  const integration = await Integration.findById(integrationId).lean();
  if (!integration) return null;

  const missing = [];
  for (const def of provider.stats) {
    const existing = integration.availableStats.find((stat) => getStatKey(provider, stat) === def.id);
    if (!existing) {
      missing.push({ dataType: "number", ...def });
    } else if (!existing.id) {
      // Entries created before stats had an id
      await Integration.updateOne({ _id: integrationId, "availableStats._id": existing._id }, { $set: { "availableStats.$.id": def.id } });
    }
  }

  if (missing.length > 0) {
    await Integration.updateOne({ _id: integrationId }, { $push: { availableStats: { $each: missing } } });
  }

  return Integration.findById(integrationId).lean();
};

/**
 * @function ensureProviderCategory
 * @description Returns the category holding the provider's stats, creating it if needed.
 * @param {Object} provider - Provider definition (uses provider.statCategory).
 * @returns {Promise<Object>} The category document.
 */
export const ensureProviderCategory = async (provider) => {
  const { name } = provider.statCategory;
  const existing = await Category.findOne({ name });
  if (existing) return existing;

  try {
    const last = await Category.findOne({}).sort({ order: -1 });
    return await Category.create({ ...provider.statCategory, order: last ? last.order + 1 : 0 });
  } catch (err) {
    // Created by a concurrent request in the meantime
    if (err.code === 11000) return Category.findOne({ name });
    throw err;
  }
};
