import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { app } from "../../../src/app.js";
import { User } from "../../../src/models/userModel.js";
import { Integration } from "../../../src/models/integrationModel.js";
import { IntegrationUser } from "../../../src/models/integrationUser.js";
import { regularUser, userWithHashPassword } from "../../fixtures/users.js";
import { authCookie } from "../../helpers.js";

describe("Integrations", () => {
  let user;
  let other;
  let integration;

  beforeEach(async () => {
    user = await User.create(regularUser);
    other = await User.create(userWithHashPassword);
    integration = await Integration.create({
      name: "GitHub",
      status: "available",
      config: { authUrl: "auth/github" },
      availableStats: [{ id: "commits", name: "Total Commits", dataType: "number" }],
    });
  });

  describe("GitHub OAuth redirect", () => {
    it("should require authentication", async () => {
      const response = await request(app).get(`/api/integrations/auth/github?integrationId=${integration._id}&userId=${user._id}`);

      expect(response.status).toBe(401);
    });

    it("should redirect to GitHub with a state and the read-only scope", async () => {
      const response = await request(app)
        .get(`/api/integrations/auth/github?integrationId=${integration._id}`)
        .set("Cookie", authCookie(user));

      expect(response.status).toBe(302);
      const location = new URL(response.headers.location);
      expect(location.origin + location.pathname).toBe("https://github.com/login/oauth/authorize");
      expect(location.searchParams.get("scope")).toBe("read:user");
      expect(location.searchParams.get("state")).toMatch(/^[0-9a-f]{32}$/);
    });

    it("should reject a callback whose state does not match", async () => {
      const response = await request(app).get("/api/integrations/auth/github/callback?code=abc&state=forged");

      expect(response.status).toBe(400);
    });
  });

  describe("Connection management", () => {
    beforeEach(async () => {
      await IntegrationUser.create({ userId: user._id, integrationId: integration._id, accessToken: "encrypted", activedStat: [] });
    });

    it("should never expose the stored access token", async () => {
      const response = await request(app).get("/api/integrations/enabled").set("Cookie", authCookie(user));

      expect(response.status).toBe(200);
      expect(response.body[0].isConnected).toBe(true);
      expect(response.body[0].integrationUser.accessToken).toBe(undefined);
    });

    it("should disconnect the connected user and drop the token", async () => {
      const response = await request(app).delete(`/api/integrations/${integration._id}/connection`).set("Cookie", authCookie(user));

      expect(response.status).toBe(200);
      const connection = await IntegrationUser.findOne({ userId: user._id });
      expect(connection.connected).toBe(false);
      expect(connection.accessToken).toBe(undefined);
    });

    it("should only touch the connected user's own connection", async () => {
      const response = await request(app).delete(`/api/integrations/${integration._id}/connection`).set("Cookie", authCookie(other));

      expect(response.status).toBe(404);
      expect((await IntegrationUser.findOne({ userId: user._id })).connected).toBe(true);
    });

    it("should toggle a stat that belongs to the integration", async () => {
      const statId = integration.availableStats[0]._id.toString();

      const response = await request(app)
        .patch(`/api/integrations/${integration._id}/stat/${statId}/toggle`)
        .set("Cookie", authCookie(user));

      expect(response.status).toBe(200);
      expect(response.body.integrationUser.activedStat).toEqual([statId]);
      expect(response.body.integrationUser.accessToken).toBe(undefined);
    });

    it("should refuse to toggle a stat that is not part of the integration", async () => {
      const response = await request(app)
        .patch(`/api/integrations/${integration._id}/stat/${new mongoose.Types.ObjectId()}/toggle`)
        .set("Cookie", authCookie(user));

      expect(response.status).toBe(404);
    });

    it("should not sync a disconnected integration", async () => {
      await IntegrationUser.updateOne({ userId: user._id }, { connected: false, $unset: { accessToken: 1 } });

      const response = await request(app).post(`/api/integrations/${integration._id}/sync`).set("Cookie", authCookie(user));

      expect(response.status).toBe(404);
    });
  });

  describe("Admin management", () => {
    it("should restrict integration creation to admins", async () => {
      const response = await request(app).post("/api/integrations").set("Cookie", authCookie(user)).send({ name: "Strava" });

      expect(response.status).toBe(403);
    });
  });
});
