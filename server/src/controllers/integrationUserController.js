import crypto from "crypto";
import { encrypt } from "../utils/crypto.js";
import { IntegrationUser } from "../models/integrationUser.js";

export const redirectToGithub = (req, res) => {
  const { integrationId } = req.query;

  try {
    const { GITHUB_CLIENT_ID, SELF_URL } = process.env;

    if (!GITHUB_CLIENT_ID || !SELF_URL) {
      return res.status(500).json({ error: "Missing env variables for GitHub OAuth." });
    }

    const userId = req.userId;
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

    res.status(200).json({
      message: "Redirecting to GitHub for OAuth.",
      redirectUrl: githubAuthUrl,
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ error: error.message });
  }
};

export const getGithubUser = async (req, res) => {
  const { code, state } = req.query;

  const expectedState = req.session.github_oauth_state;
  const integrationId = req.session.github_oauth_integration;
  const userId = req.session.github_oauth_user;

  console.log(req.session);

  if (!code) {
    return res.status(400).send("No code provided for GitHub OAuth.");
  }

  if (!state || state !== expectedState) {
    console.error("Invalid OAuth state:", { received: state, expected: expectedState });
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

    // Redirige vers le tableau de bord des intégrations
    res.redirect(`${process.env.CORS_ORIGIN}/integrations`);
  } catch (err) {
    res.status(500).send(err.message);
  }
};
