import crypto from "crypto";
import { decrypt, encrypt } from "../utils/crypto.js";
import { IntegrationUser } from "../models/integrationUser.js";
import { User } from "../models/userModel.js";
import { Integration } from "../models/integrationModel.js";
import { getMaxStreak, getTotalCommits } from "../utils/github/stats.js";
import { Stat } from "../models/statModel.js";
import { Category } from "../models/categoryModel.js";

export const redirectToGithub = async (req, res) => {
  const { integrationId, userId } = req.query;

  try {
    const { GITHUB_CLIENT_ID, SELF_URL } = process.env;

    if (!GITHUB_CLIENT_ID || !SELF_URL) {
      return res.status(500).json({ error: "Missing env variables for GitHub OAuth." });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    const integration = await Integration.findById(integrationId);
    if (!integration) {
      return res.status(404).json({ error: "Integration not found." });
    }

    const state = crypto.randomBytes(16).toString("hex");

    req.session.github_oauth_state = state;
    req.session.github_oauth_integration = integrationId;
    req.session.github_oauth_user = userId;
    req.session.save();

    const redirectUri = `${process.env.SELF_URL}/api/integrations/auth/github/callback`;

    const githubAuthUrl =
      `https://github.com/login/oauth/authorize` +
      `?client_id=${process.env.GITHUB_CLIENT_ID}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=read:user repo` +
      `&state=${state}`;

    res.redirect(githubAuthUrl);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getGithubUser = async (req, res) => {
  const { code, state } = req.query;

  const expectedState = req.session.github_oauth_state;
  const integrationId = req.session.github_oauth_integration;
  const userId = req.session.github_oauth_user;

  if (!code) return res.status(400).send("No code provided for GitHub OAuth.");
  if (!state || state !== expectedState) return res.status(400).send("Invalid OAuth state.");
  if (!userId) return res.status(401).send("No user context");
  if (!integrationId) return res.status(400).send("No integration context");
  if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET)
    return res.status(500).json({ error: "Missing GitHub OAuth env variables." });

  try {
    // 1️⃣ Échange le code contre un access token GitHub
    const response = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      }),
    });

    const data = await response.json();
    if (!data.access_token) return res.status(500).json({ error: "No access token received from GitHub." });

    const access_token = data.access_token;

    // 2️⃣ Récupère l'user GitHub
    const userResponse = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${access_token}`, Accept: "application/vnd.github+json" },
    });
    const githubUser = await userResponse.json();
    if (!githubUser?.id) return res.status(500).json({ error: "Failed to fetch GitHub user." });

    // 3️⃣ Mets à jour l'IntegrationUser de base
    await IntegrationUser.findOneAndUpdate(
      { userId, integrationId },
      {
        userId,
        integrationId,
        connected: true,
        accessToken: encrypt(access_token),
        config: { githubUser },
      },
      { upsert: true, new: true },
    );

    // 4️⃣ Supprime les valeurs de session de mongoStore
    req.session.github_oauth_state = null;
    req.session.github_oauth_integration = null;
    req.session.github_oauth_user = null;
    req.session.save();

    // 5️⃣ Récupère les valeurs GitHub
    const totalCommits = await getTotalCommits(access_token, githubUser.created_at);
    const maxStreak = await getMaxStreak(access_token);

    // 6️⃣ Supprime les stats doublons côté Integration
    await Integration.findByIdAndUpdate(integrationId, {
      $pull: { availableStats: { name: { $in: ["Total Commits", "Max Streak"] } } },
    });

    // 7️⃣ Ajoute les nouvelles
    await Integration.findByIdAndUpdate(integrationId, {
      $push: {
        availableStats: [
          {
            name: "Total Commits",
            value: totalCommits,
            dataType: "number",
            description: "Total number of commits made by the user on GitHub.",
          },
          {
            name: "Max Streak",
            value: maxStreak,
            dataType: "number",
            description: "Maximum consecutive days of commits made by the user on GitHub.",
            unit: "days",
          },
        ],
      },
    });

    // 8️⃣ Récupère l’intégration mise à jour pour choper les `_id`
    const integration = await Integration.findById(integrationId).lean();

    // ➜ Map nom stat -> _id du availableStat correspondant
    const availableStatsMap = {};
    integration.availableStats.forEach((s) => {
      availableStatsMap[s.name] = s._id;
    });

    //Les mettre dans integrationUser
    await IntegrationUser.findOneAndUpdate({ userId, integrationId }, { activedStat: integration.availableStats });

    // 🔟 Assure la catégorie côté Stat
    let githubCategory = await Category.findOne({
      name: "GitHub",
      description: "Stats fetched from your GitHub account",
    });
    if (!githubCategory) {
      githubCategory = await Category.create({
        name: "GitHub",
        description: "Stats fetched from your GitHub account",
        icon: "Github",
        color: "#24292e",
      });
    }

    // 1️⃣1️⃣ Upsert des Stat personnelles avec lien vers availableStat
    const statsData = [
      { name: "Total Commits", description: "Total number of commits made by the user on GitHub.", value: totalCommits, unit: "commits" },
      {
        name: "Max Streak",
        description: "Maximum consecutive days of commits made by the user on GitHub.",
        value: maxStreak,
        unit: "days",
      },
    ];

    for (const stat of statsData) {
      await Stat.findOneAndUpdate(
        { userId, categoryId: githubCategory._id, name: stat.name },
        {
          $set: {
            description: stat.description,
            value: stat.value,
            unit: stat.unit,
            current: true,
            hided: false,
            integrationId: integrationId,
            integrationStatId: availableStatsMap[stat.name],
          },
        },
        { upsert: true, new: true },
      );
    }

    res.redirect(`${process.env.CORS_ORIGIN}/integrations`);
  } catch (err) {
    console.error(err);
    res.status(500).send(err.message);
  }
};

export const toggleActivedStat = async (req, res) => {
  try {
    const userId = req.userId;
    const { integrationId, statId } = req.params;

    if (!integrationId || !statId) {
      return res.status(400).json({ error: "Missing integrationId or statId" });
    }

    // Récupérer l’instance IntegrationUser
    const integrationUser = await IntegrationUser.findOne({ userId, integrationId });

    if (!integrationUser) {
      return res.status(404).json({ error: "IntegrationUser not found" });
    }

    const isActive = integrationUser.activedStat.some((id) => id.toString() === statId);

    if (isActive) {
      integrationUser.activedStat.pull(statId);
    } else {
      integrationUser.activedStat.push(statId);
    }

    await integrationUser.save();

    return res.status(200).json({ integrationUser, message: isActive ? "Stat deactivated successfully." : "Stat activated successfully." });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const syncStatistics = async (req, res) => {
  const userId = req.userId;
  const { integrationId } = req.params;
  if (!integrationId) {
    return res.status(400).json({ error: "Missing integrationId" });
  }

  try {
    const integrationUser = await IntegrationUser.findOne({ userId, integrationId }).lean();
    if (!integrationUser) {
      return res.status(404).json({ error: "IntegrationUser not found" });
    }
    if (!integrationUser.activedStat || integrationUser.activedStat.length === 0) {
      return res.status(400).json({ error: "No activated stats to sync" });
    }

    const integration = await Integration.findById(integrationId).lean();
    if (!integration) {
      return res.status(404).json({ error: "Integration not found" });
    }

    // Map availableStats par _id pour accès rapide
    const availableStatsMap = {};
    integration.availableStats.forEach((stat) => {
      availableStatsMap[stat._id.toString()] = stat;
    });

    // Récupère les données GitHub une fois pour toutes
    let totalCommits = null;
    let maxStreak = null;

    // Vérifie que les stats sont activées
    const hasTotalCommits = integrationUser.activedStat.some((id) => availableStatsMap[id.toString()]?.name === "Total Commits");
    const hasMaxStreak = integrationUser.activedStat.some((id) => availableStatsMap[id.toString()]?.name === "Max Streak");

    if (hasTotalCommits) {
      totalCommits = await getTotalCommits(decrypt(integrationUser.accessToken), integrationUser.config.githubUser.created_at);
    }
    if (hasMaxStreak) {
      maxStreak = await getMaxStreak(decrypt(integrationUser.accessToken));
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

    return res.status(200).json({
      message: "Statistics synced successfully",
      updatedStats,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
