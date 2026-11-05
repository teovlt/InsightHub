import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import { app } from "../../../src/app.js";
import { User } from "../../../src/models/userModel.js";
import { Category } from "../../../src/models/categoryModel.js";
import { Stat } from "../../../src/models/statModel.js";
import { Integration } from "../../../src/models/integrationModel.js";
import { IntegrationUser } from "../../../src/models/integrationUser.js";
import { UserAchievement } from "../../../src/models/userAchievementModel.js";
import { emitToUser } from "../../../src/sockets/socket.js";
import { evaluateAchievements } from "../../../src/achievements/service.js";
import { deleteUserData } from "../../../src/utils/userData.js";
import { regularUser, userWithHashPassword } from "../../fixtures/users.js";
import { authCookie } from "../../helpers.js";

vi.mock("../../../src/sockets/socket.js", () => ({ emitToUser: vi.fn(), initSockets: vi.fn() }));

const unlockEvents = () => vi.mocked(emitToUser).mock.calls.filter(([, event]) => event === "achievement:unlocked");

describe("Achievements", () => {
  let user;
  let other;
  let category;

  beforeEach(async () => {
    vi.mocked(emitToUser).mockClear();
    user = await User.create(regularUser);
    other = await User.create(userWithHashPassword);
    category = await Category.create({ name: "Sport", description: "d", icon: "Heart", color: "#ff0000" });
  });

  const createStats = (count, owner = user) =>
    Promise.all(
      Array.from({ length: count }, (_, i) => Stat.create({ userId: owner._id, categoryId: category._id, name: `Stat ${i}`, value: "1" })),
    );

  it("should require authentication", async () => {
    const response = await request(app).get("/api/achievements");
    expect(response.status).toBe(401);
  });

  it("should list every achievement locked for a new user", async () => {
    const response = await request(app).get("/api/achievements").set("Cookie", authCookie(user));

    expect(response.status).toBe(200);
    const apps = response.body.achievements.find((a) => a.id === "apps_connected");
    expect(apps).toMatchObject({ progress: 0, tier: null, unlockedAt: null, next: { tier: "bronze", threshold: 1 } });
    expect(apps.tiers).toHaveLength(3);
    expect(response.body.achievements.every((a) => a.tier === null)).toBe(true);
  });

  it("should unlock reached tiers once, keeping the first unlock date", async () => {
    await createStats(5);

    const first = await evaluateAchievements(user._id);
    expect(first.map((a) => `${a.id}:${a.tier}`)).toEqual(["stats_created:bronze"]);
    expect(unlockEvents()).toHaveLength(1);
    expect(unlockEvents()[0][2]).toMatchObject({ id: "stats_created", tier: "bronze", threshold: 5 });

    const unlockedAt = (await UserAchievement.findOne({ userId: user._id })).unlockedAt;
    const again = await evaluateAchievements(user._id);
    await evaluateAchievements(user._id);

    expect(again).toEqual([]);
    expect(unlockEvents()).toHaveLength(1);
    expect(await UserAchievement.countDocuments({ userId: user._id })).toBe(1);
    expect((await UserAchievement.findOne({ userId: user._id })).unlockedAt).toEqual(unlockedAt);
  });

  it("should not unlock twice when evaluations race", async () => {
    await UserAchievement.init();
    await createStats(5);

    const results = await Promise.all([evaluateAchievements(user._id), evaluateAchievements(user._id), evaluateAchievements(user._id)]);

    expect(results.flat()).toHaveLength(1);
    expect(await UserAchievement.countDocuments({ userId: user._id })).toBe(1);
  });

  it("should keep an achievement unlocked when progress goes back down", async () => {
    const stats = await createStats(5);
    await evaluateAchievements(user._id);
    await Stat.deleteOne({ _id: stats[0]._id });

    const response = await request(app).get("/api/achievements").set("Cookie", authCookie(user));
    const created = response.body.achievements.find((a) => a.id === "stats_created");
    expect(created).toMatchObject({ progress: 4, tier: "bronze", next: { tier: "silver", threshold: 20 } });
    expect(created.unlockedAt).toBeTruthy();
  });

  it("should unlock on stat creation through the API", async () => {
    await createStats(4);

    const response = await request(app)
      .post("/api/stats")
      .set("Cookie", authCookie(user))
      .send({ name: "Pompes", value: "20", categoryId: category._id.toString() });

    expect(response.status).toBe(201);
    expect(await UserAchievement.exists({ userId: user._id, achievementId: "stats_created", tier: "bronze" })).toBeTruthy();
    expect(unlockEvents()[0][0].toString()).toBe(user._id.toString());
  });

  it("should unlock goals_reached when a value reaches the goal", async () => {
    const stat = await Stat.create({
      userId: user._id,
      categoryId: category._id,
      name: "Pages",
      value: "40",
      goal: { target: 50, direction: "increase", start: 40 },
    });

    await request(app).put(`/api/stats/${stat._id}`).set("Cookie", authCookie(user)).send({ value: "49" });
    expect(await UserAchievement.exists({ userId: user._id, achievementId: "goals_reached" })).toBeFalsy();

    const current = await Stat.findOne({ userId: user._id, current: true });
    await request(app).put(`/api/stats/${current._id}`).set("Cookie", authCookie(user)).send({ value: "52" });
    expect(await UserAchievement.exists({ userId: user._id, achievementId: "goals_reached", tier: "bronze" })).toBeTruthy();
  });

  it("should count connected and synced apps", async () => {
    const integrations = await Promise.all(
      ["A", "B", "C"].map((name) => Integration.create({ name, status: "available", availableStats: [] })),
    );
    await IntegrationUser.create({ userId: user._id, integrationId: integrations[0]._id, lastSyncedAt: new Date() });
    await IntegrationUser.create({ userId: user._id, integrationId: integrations[1]._id });
    // A disconnected app does not count
    await IntegrationUser.create({ userId: user._id, integrationId: integrations[2]._id, connected: false });

    const unlocked = await evaluateAchievements(user._id);

    expect(unlocked.map((a) => `${a.id}:${a.tier}`).sort()).toEqual(["apps_connected:bronze", "first_sync:bronze"]);
  });

  it("should count logged days and the best streak", async () => {
    const [stat] = await createStats(1);
    const day = (d) => new Date(Date.UTC(2026, 9, d, 12));
    // Older versions on three consecutive days, then a gap
    await Stat.collection.insertMany(
      [1, 2, 3, 6].map((d) => ({
        userId: user._id,
        categoryId: category._id,
        name: stat.name,
        value: "1",
        current: false,
        createdAt: day(d),
      })),
    );
    await Stat.collection.updateOne({ _id: stat._id }, { $set: { createdAt: day(20) } });

    const response = await request(app).get("/api/achievements").set("Cookie", authCookie(user));
    const byId = Object.fromEntries(response.body.achievements.map((a) => [a.id, a]));

    expect(byId.days_logged.progress).toBe(5);
    expect(byId.streak).toMatchObject({ progress: 3, tier: "bronze" });
  });

  it("should unlock silently when listing, and only for the requesting user", async () => {
    await createStats(5, other);

    const response = await request(app).get("/api/achievements").set("Cookie", authCookie(other));

    expect(response.body.achievements.find((a) => a.id === "stats_created").tier).toBe("bronze");
    expect(unlockEvents()).toHaveLength(0);
    expect(await UserAchievement.countDocuments({ userId: user._id })).toBe(0);
  });

  it("should delete achievements with the account", async () => {
    await createStats(5);
    await evaluateAchievements(user._id);

    await deleteUserData(user);

    expect(await UserAchievement.countDocuments({ userId: user._id })).toBe(0);
  });
});
