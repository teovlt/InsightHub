import { Integration } from "../models/integrationModel.js";
import { IntegrationUser } from "../models/integrationUser.js";
import { Stat } from "../models/statModel.js";
import { decrypt } from "./crypto.js";
import { ensureProviderCategory, getStatKey } from "../integrations/ensure.js";
import { getProvider } from "../integrations/index.js";

// Automatic syncs (home page) run at most this often; a manual sync always runs
export const SYNC_INTERVAL = 30 * 60 * 1000;

/**
 * @function repairActivatedStats
 * @description Makes the user's activated stats point to the integration's current availableStats.
 * Connections made before availableStats ids were stable may reference ids that no longer exist:
 * they are matched back by stat name, and the user's Stat documents are re-linked the same way.
 * @param {Object} integrationUser - IntegrationUser (lean).
 * @param {Object} integration - Integration (lean).
 * @returns {Promise<string[]>} The valid activated stat ids.
 */
export const repairActivatedStats = async (integrationUser, integration) => {
  const availableById = new Map(integration.availableStats.map((stat) => [stat._id.toString(), stat]));
  const activated = (integrationUser.activedStat || []).map((id) => id.toString());

  if (activated.every((id) => availableById.has(id))) return activated;

  const availableByName = new Map(integration.availableStats.map((stat) => [stat.name, stat]));
  const repaired = new Set(activated.filter((id) => availableById.has(id)));

  const stats = await Stat.find({ userId: integrationUser.userId, integrationId: integration._id })
    .select("name integrationStatId current")
    .lean();
  for (const stat of stats) {
    const available = availableByName.get(stat.name);
    if (!available) continue;
    if (stat.integrationStatId?.toString() !== available._id.toString()) {
      await Stat.updateOne({ _id: stat._id }, { integrationStatId: available._id });
    }
    if (stat.current) repaired.add(available._id.toString());
  }

  // Nothing could be matched: fall back to everything, as on a first connection
  const result = repaired.size > 0 ? [...repaired] : [...availableById.keys()];
  await IntegrationUser.updateOne({ _id: integrationUser._id }, { activedStat: result });
  return result;
};

/**
 * @function autoSyncStats
 * @description Refreshes the user's activated stats for an integration from the third-party API.
 * @param {string} userId - The user.
 * @param {string} integrationId - The integration.
 * @param {Object} [options]
 * @param {boolean} [options.force=false] - Ignore SYNC_INTERVAL.
 * @returns {Promise<{ updatedStats?: Object[], skipped?: boolean, error?: string }>} The result.
 */
export const autoSyncStats = async (userId, integrationId, { force = false } = {}) => {
  if (!integrationId) {
    return { error: "integrationId is required" };
  }

  try {
    const integrationUser = await IntegrationUser.findOne({ userId, integrationId }).lean();
    // A disconnected integration no longer has a token and must not be synced
    if (!integrationUser || !integrationUser.connected || !integrationUser.accessToken) {
      return { error: "IntegrationUser not found" };
    }

    if (!force && integrationUser.lastSyncedAt && Date.now() - new Date(integrationUser.lastSyncedAt).getTime() < SYNC_INTERVAL) {
      return { updatedStats: [], skipped: true };
    }

    const integration = await Integration.findById(integrationId).lean();
    if (!integration) {
      return { error: "Integration not found" };
    }
    const provider = getProvider(integration);
    if (!provider) {
      return { error: "No provider handles this integration" };
    }

    const activatedIds = new Set(await repairActivatedStats(integrationUser, integration));
    const activeStats = integration.availableStats.filter((stat) => activatedIds.has(stat._id.toString()) && getStatKey(provider, stat));
    if (activeStats.length === 0) {
      return { error: "No activated stats to sync" };
    }

    const values = await provider.fetchStats(
      decrypt(integrationUser.accessToken),
      activeStats.map((stat) => getStatKey(provider, stat)),
      integrationUser,
    );
    const category = await ensureProviderCategory(provider);

    const updatedStats = [];
    for (const availableStat of activeStats) {
      const value = values[getStatKey(provider, availableStat)];
      if (value === null || value === undefined) continue;

      // categoryId is always set so a stat never ends up orphaned
      const fields = {
        name: availableStat.name,
        description: availableStat.description,
        unit: availableStat.unit ?? "",
        categoryId: category._id,
      };
      const key = { userId, integrationId, integrationStatId: availableStat._id };
      const current = await Stat.findOne({ ...key, current: true }).sort({ createdAt: -1 });

      let stat;
      if (!current) {
        stat = await Stat.create({ ...key, ...fields, value: value.toString(), hided: false, current: true });
      } else if (current.value !== value.toString()) {
        // A new value becomes a new version so the stat keeps its history (charts, trends)
        current.current = false;
        await current.save();
        stat = await Stat.create({
          ...key,
          ...fields,
          value: value.toString(),
          hided: current.hided,
          pinned: current.pinned,
          goal: current.goal,
          current: true,
        });
      } else {
        Object.assign(current, fields);
        stat = await current.save();
      }
      stat = stat.toObject();

      // Older syncs could leave several current versions of the same stat
      await Stat.updateMany({ ...key, current: true, _id: { $ne: stat._id } }, { current: false });

      updatedStats.push(stat);
    }

    await IntegrationUser.updateOne({ _id: integrationUser._id }, { lastSyncedAt: new Date() });

    return { updatedStats };
  } catch (error) {
    console.error("autoSyncStats:", error.message);
    return { error: error.message };
  }
};
