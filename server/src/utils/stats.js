import { Integration } from "../models/integrationModel.js";
import { IntegrationUser } from "../models/integrationUser.js";
import { Stat } from "../models/statModel.js";
import { decrypt } from "./crypto.js";
import { getMaxStreak, getTotalCommits, getTotalStars } from "./github/stats.js";

export const autoSyncStats = async (userId, integrationId) => {
  if (!integrationId) {
    return { error: "integrationId is required" };
  }

  try {
    const integrationUser = await IntegrationUser.findOne({ userId, integrationId }).lean();
    if (!integrationUser) {
      return { error: "IntegrationUser not found" };
    }
    if (!integrationUser.activedStat || integrationUser.activedStat.length === 0) {
      return { error: "No activated stats to sync" };
    }

    const integration = await Integration.findById(integrationId).lean();
    if (!integration) {
      return { error: "Integration not found" };
    }

    // Map availableStats par _id pour accès rapide
    const availableStatsMap = {};
    integration.availableStats.forEach((stat) => {
      availableStatsMap[stat._id.toString()] = stat;
    });

    // Récupère les données GitHub une fois pour toutes
    let totalCommits = null;
    let maxStreak = null;
    let totalStars = null;
    // Vérifie que les stats sont activées
    const hasTotalCommits = integrationUser.activedStat.some((id) => availableStatsMap[id.toString()]?.name === "Total Commits");
    const hasMaxStreak = integrationUser.activedStat.some((id) => availableStatsMap[id.toString()]?.name === "Max Streak");
    const hasTotalStars = integrationUser.activedStat.some((id) => availableStatsMap[id.toString()]?.name === "Total Stars");

    if (hasTotalCommits) {
      totalCommits = await getTotalCommits(decrypt(integrationUser.accessToken), integrationUser.config.githubUser.created_at);
    }
    if (hasMaxStreak) {
      maxStreak = await getMaxStreak(decrypt(integrationUser.accessToken));
    }
    if (hasTotalStars) {
      totalStars = await getTotalStars(decrypt(integrationUser.accessToken));
    }

    // Mets à jour les stats en base
    const updatePromises = integrationUser.activedStat.map(async (statId) => {
      const availableStat = availableStatsMap[statId.toString()];
      if (!availableStat) return null;

      let valueToSet = null;
      if (availableStat.name === "Total Commits") {
        valueToSet = totalCommits;
      } else if (availableStat.name === "Max Streak") {
        valueToSet = maxStreak;
      } else if (availableStat.name === "Total Stars") {
        valueToSet = totalStars;
      } else {
        // Ici tu peux gérer d'autres stats, par défaut null ou skip
        return null;
      }

      if (valueToSet === null) return null;

      // Update ou création de la stat
      return Stat.findOneAndUpdate(
        {
          userId,
          integrationId,
          integrationStatId: availableStat._id,
        },
        {
          value: valueToSet.toString(),
          updatedAt: new Date(),
          current: true,
          auto: true,
          name: availableStat.name,
        },
        { new: true, upsert: true },
      ).lean();
    });

    const updatedStats = (await Promise.all(updatePromises)).filter(Boolean);

    return { updatedStats };
  } catch (error) {
    return { error: error.message };
  }
};
