import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../../src/app.js";
import { User } from "../../../src/models/userModel.js";
import { Category } from "../../../src/models/categoryModel.js";
import { Stat } from "../../../src/models/statModel.js";
import { Integration } from "../../../src/models/integrationModel.js";
import { IntegrationUser } from "../../../src/models/integrationUser.js";
import { Log } from "../../../src/models/logModel.js";
import { adminUser, regularUser } from "../../fixtures/users.js";
import { authCookie } from "../../helpers.js";

describe("Admin overview", () => {
  let admin;
  let user;

  beforeEach(async () => {
    admin = await User.create(adminUser);
    user = await User.create(regularUser);
  });

  it("should be reserved to admins", async () => {
    const response = await request(app).get("/api/admin/overview").set("Cookie", authCookie(user));

    expect(response.status).toBe(403);
  });

  it("should summarize users, content, integrations and problems", async () => {
    const category = await Category.create({ name: "Sport", description: "d", icon: "Dumbbell", color: "#ff0000" });
    await Stat.create({ userId: user._id, categoryId: category._id, name: "Pushups", value: "10", goal: { target: 20 } });
    const lichess = await Integration.create({ name: "Lichess", status: "available" });
    await Integration.create({ name: "Steam", status: "disabled" });
    await IntegrationUser.create({
      userId: user._id,
      integrationId: lichess._id,
      lastSyncedAt: new Date(Date.now() - 1000),
      lastSyncAttemptAt: new Date(),
    });
    await IntegrationUser.create({ userId: admin._id, integrationId: lichess._id, lastSyncedAt: new Date() });
    await Log.create({ message: "Sync failed", level: "error", user: user._id });
    await Log.create({ message: "Logged in", level: "info", user: user._id });

    const response = await request(app).get("/api/admin/overview").set("Cookie", authCookie(admin));

    expect(response.status).toBe(200);
    const { users, signups, content, integrations, logs } = response.body;
    expect(users).toMatchObject({ total: 2, newWeek: 2, newMonth: 2, activeWeek: 1 });
    expect(users.byAuth.find((a) => a.type === "local").count).toBe(2);
    expect(signups).toHaveLength(30);
    expect(signups.at(-1).count).toBe(2);
    expect(content).toMatchObject({ stats: 1, valuesWeek: 1, goals: 1, badges: 0 });
    expect(integrations[0]).toMatchObject({ name: "Lichess", connections: 2, failing: 1 });
    expect(integrations[1]).toMatchObject({ name: "Steam", status: "disabled", connections: 0 });
    expect(logs.problemsWeek).toBe(1);
    expect(logs.latest.map((l) => l.message)).toEqual(["Sync failed"]);
  });
});

describe("Admin tools", () => {
  let admin;
  let user;

  beforeEach(async () => {
    admin = await User.create(adminUser);
    user = await User.create(regularUser);
  });

  it("should queue a sync of every connected integration", async () => {
    const integration = await Integration.create({ name: "Lichess", status: "available" });
    await IntegrationUser.create({ userId: user._id, integrationId: integration._id, accessToken: "token", lastSyncedAt: new Date() });
    await IntegrationUser.create({ userId: admin._id, integrationId: integration._id, accessToken: "token", connected: false });

    const response = await request(app).post("/api/admin/sync").set("Cookie", authCookie(admin)).set("Origin", "http://localhost:5173");

    expect(response.status).toBe(202);
    // Fresh connections are synced too; disconnected ones never are
    expect(response.body.queued).toBe(1);
  });

  it("should filter logs by level", async () => {
    await Log.create({ message: "Boom", level: "error", user: user._id });
    await Log.create({ message: "Hello", level: "info", user: user._id });

    const errors = await request(app).get("/api/logs?level=error").set("Cookie", authCookie(admin));
    const all = await request(app).get("/api/logs?level=nope").set("Cookie", authCookie(admin));

    expect(errors.body.logs.map((log) => log.message)).toEqual(["Boom"]);
    expect(errors.body.count).toBe(1);
    expect(all.body.count).toBe(2);
  });

  it("should give each listed user their activity", async () => {
    const category = await Category.create({ name: "Sport", description: "d", icon: "Dumbbell", color: "#ff0000" });
    await Stat.create({ userId: user._id, categoryId: category._id, name: "Pushups", value: "10", current: false });
    await Stat.create({ userId: user._id, categoryId: category._id, name: "Pushups", value: "12" });
    const integration = await Integration.create({ name: "Lichess", status: "available" });
    await IntegrationUser.create({ userId: user._id, integrationId: integration._id });

    const response = await request(app).get("/api/users?page=0&size=10").set("Cookie", authCookie(admin));

    const listed = response.body.users.find((u) => u._id === user._id.toString());
    expect(listed.activity).toMatchObject({ stats: 1, apps: 1, lastActivity: expect.any(String) });
    expect(listed.password).toBeUndefined();
    expect(response.body.users.find((u) => u._id === admin._id.toString()).activity).toEqual({ stats: 0, apps: 0, lastActivity: null });
  });
});
