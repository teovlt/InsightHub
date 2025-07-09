import crypto from "crypto";
import { encrypt } from "../utils/crypto.js";
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

  if (!code) {
    return res.status(400).send("No code provided for GitHub OAuth.");
  }

  if (!state || state !== expectedState) {
    return res.status(400).send("Invalid OAuth state.");
  }

  if (!userId) {
    return res.status(401).send("No user context");
  }

  if (!integrationId) {
    return res.status(400).send("No integration context");
  }

  if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
    return res.status(500).json({ error: "Missing GitHub OAuth env variables." });
  }

  try {
    // Échange le code contre un access token
    const response = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      }),
    });

    const data = await response.json();

    if (!data.access_token) {
      console.error("No access_token received:", data);
      return res.status(500).json({ error: "No access token received from GitHub." });
    }

    const access_token = data.access_token;

    // Récupère l'utilisateur GitHub
    const userResponse = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${access_token}`,
        Accept: "application/vnd.github+json",
      },
    });

    const githubUser = await userResponse.json();

    if (!githubUser || !githubUser.id) {
      return res.status(500).json({ error: "Failed to fetch GitHub user." });
    }

    await IntegrationUser.findOneAndUpdate(
      { userId, integrationId },
      {
        userId,
        integrationId,
        connected: true,
        accessToken: encrypt(access_token),
        config: {
          githubUser: githubUser,
        },
      },
      { upsert: true, new: true },
    );

    // Supprime les données de session liées à l'OAuth GitHub
    delete req.session.github_oauth_state;
    delete req.session.github_oauth_integration;
    delete req.session.github_oauth_user;

    const totalCommits = await getTotalCommits(access_token);
    const maxStreak = await getMaxStreak(access_token);

    //Modifier l'intégration en ajoutant des stats disponibles
    await Integration.findByIdAndUpdate(integrationId, {
      $pull: { availableStats: { name: "Total Commits" } },
      $pull: { availableStats: { name: "Max Streak" } },
    });
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

    // Assure la catégorie GitHub
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

    // Upsert des stats
    const statsData = [
      {
        name: "Total Commits",
        description: "Total number of commits made by the user on GitHub.",
        value: totalCommits,
        unit: "commits",
      },
      {
        name: "Max Streak",
        description: "Maximum consecutive days of commits made by the user on GitHub.",
        value: maxStreak,
        unit: "days",
      },
    ];

    for (const stat of statsData) {
      await Stat.findOneAndUpdate(
        {
          userId,
          categoryId: githubCategory._id,
          name: stat.name,
        },
        {
          $set: {
            description: stat.description,
            value: stat.value,
            unit: stat.unit,
            current: true,
            hided: false,
          },
        },
        { upsert: true, new: true },
      );
    }

    // Redirige vers le tableau de bord des intégrations
    res.redirect(`${process.env.CORS_ORIGIN}/integrations`);
  } catch (err) {
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
