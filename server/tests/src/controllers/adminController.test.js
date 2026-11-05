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
