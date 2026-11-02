import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import mongoose from "mongoose";
import { User } from "../../../src/models/userModel.js";
import { Integration } from "../../../src/models/integrationModel.js";
import { IntegrationUser } from "../../../src/models/integrationUser.js";
import { Stat } from "../../../src/models/statModel.js";
import { Category } from "../../../src/models/categoryModel.js";
import { encrypt } from "../../../src/utils/crypto.js";
import { computeMaxStreak } from "../../../src/utils/github/stats.js";
import { ensureGithubStats, GITHUB_STATS } from "../../../src/utils/github/integration.js";
import { autoSyncStats, repairActivatedStats } from "../../../src/utils/stats.js";
import { regularUser, userWithHashPassword } from "../../fixtures/users.js";

const currentYear = new Date().getUTCFullYear();

// Fake GitHub GraphQL API: 10 commits per year, a 3-day streak spanning New Year, 5 stars
const mockGithub = () =>
  vi.spyOn(globalThis, "fetch").mockImplementation(async (_url, options) => {
    const { query } = JSON.parse(options.body);
    let viewer;
    if (query.includes("repositories")) {
      viewer = {
        repositories: { nodes: [{ stargazerCount: 2 }, { stargazerCount: 3 }], pageInfo: { hasNextPage: false, endCursor: null } },
      };
    } else {
      viewer = {};
      for (const [, year] of query.matchAll(/y(\d{4}):/g)) {
        const days =
          Number(year) === currentYear - 1
            ? [{ date: `${year}-12-31`, contributionCount: 1 }]
            : [
                { date: `${year}-01-01`, contributionCount: 2 },
                { date: `${year}-01-02`, contributionCount: 1 },
                { date: `${year}-01-03`, contributionCount: 0 },
              ];
        viewer[`y${year}`] = { totalCommitContributions: 10, contributionCalendar: { weeks: [{ contributionDays: days }] } };
      }
    }
    return new Response(JSON.stringify({ data: { viewer } }), { status: 200 });
  });

describe("GitHub integration", () => {
  let userA;
  let userB;
  let integration;

  beforeEach(async () => {
    userA = await User.create(regularUser);
    userB = await User.create(userWithHashPassword);
    integration = await Integration.create({ name: "GitHub", status: "available", config: { authUrl: "auth/github" } });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const connect = async (user) => {
    const updated = await ensureGithubStats(integration._id);
    return IntegrationUser.create({
      userId: user._id,
      integrationId: integration._id,
      accessToken: encrypt("gho_token"),
      config: { githubUser: { created_at: `${currentYear - 1}-06-01T00:00:00Z` } },
      activedStat: updated.availableStats.map((stat) => stat._id),
    });
  };

  describe("computeMaxStreak", () => {
    it("should count a streak across years and ignore duplicated days", () => {
      const streak = computeMaxStreak([
        { date: "2025-12-30", contributionCount: 1 },
        { date: "2025-12-31", contributionCount: 1 },
        { date: "2026-01-01", contributionCount: 1 },
        { date: "2025-12-31", contributionCount: 1 },
        { date: "2026-01-02", contributionCount: 0 },
        { date: "2026-01-05", contributionCount: 1 },
      ]);

      expect(streak).toBe(3);
    });

    it("should not join days separated by a gap in the calendar", () => {
      expect(
        computeMaxStreak([
          { date: "2026-01-01", contributionCount: 1 },
          { date: "2026-01-03", contributionCount: 1 },
        ]),
      ).toBe(1);
    });
  });

  describe("ensureGithubStats", () => {
    it("should keep the stat ids when another user connects", async () => {
      const first = await ensureGithubStats(integration._id);
      const second = await ensureGithubStats(integration._id);

      expect(second.availableStats).toHaveLength(GITHUB_STATS.length);
      expect(second.availableStats.map((s) => s._id.toString())).toEqual(first.availableStats.map((s) => s._id.toString()));
    });

    it("should give an id to entries created without one", async () => {
      await Integration.collection.updateOne(
        { _id: integration._id },
        { $set: { availableStats: [{ _id: new mongoose.Types.ObjectId(), name: "Total Commits", dataType: "number" }] } },
      );

      const updated = await ensureGithubStats(integration._id);

      expect(updated.availableStats).toHaveLength(GITHUB_STATS.length);
      expect(updated.availableStats.every((stat) => stat.id)).toBe(true);
    });
  });

  describe("autoSyncStats", () => {
    it("should store each user's own values in a category", async () => {
      mockGithub();
      await connect(userA);

      const result = await autoSyncStats(userA._id, integration._id);

      expect(result.error).toBeUndefined();
      const stats = await Stat.find({ userId: userA._id, current: true }).lean();
      const values = Object.fromEntries(stats.map((stat) => [stat.name, stat.value]));
      expect(values).toEqual({ "Total Commits": "20", "Max Streak": "3", "Total Stars": "5" });

      const category = await Category.findOne({ name: "GitHub" });
      expect(stats.every((stat) => stat.categoryId.equals(category._id))).toBe(true);
    });

    it("should keep syncing user A after user B connects", async () => {
      mockGithub();
      await connect(userA);
      await autoSyncStats(userA._id, integration._id);
      await connect(userB);

      await IntegrationUser.updateOne({ userId: userA._id }, { $unset: { lastSyncedAt: 1 } });
      const result = await autoSyncStats(userA._id, integration._id);

      expect(result.updatedStats).toHaveLength(GITHUB_STATS.length);
      expect(await Stat.countDocuments({ userId: userA._id, current: true })).toBe(GITHUB_STATS.length);
    });

    it("should not call GitHub again before the sync interval", async () => {
      const fetchSpy = mockGithub();
      await connect(userA);
      await autoSyncStats(userA._id, integration._id);
      const calls = fetchSpy.mock.calls.length;

      const result = await autoSyncStats(userA._id, integration._id);

      expect(result.skipped).toBe(true);
      expect(fetchSpy.mock.calls.length).toBe(calls);
    });

    it("should leave a single current version of each stat", async () => {
      mockGithub();
      const connection = await connect(userA);
      const statId = connection.activedStat[0];
      const category = await Category.create({ name: "GitHub", description: "d", icon: "Github", color: "#24292e" });
      for (let i = 0; i < 2; i++) {
        await Stat.create({
          userId: userA._id,
          categoryId: category._id,
          name: "Total Commits",
          value: "1",
          integrationId: integration._id,
          integrationStatId: statId,
        });
      }

      await autoSyncStats(userA._id, integration._id);

      expect(await Stat.countDocuments({ userId: userA._id, integrationStatId: statId, current: true })).toBe(1);
    });

    it("should keep the previous value as history when a synced value changes", async () => {
      mockGithub();
      const connection = await connect(userA);
      const statId = connection.activedStat[0];
      const category = await Category.create({ name: "GitHub", description: "d", icon: "Github", color: "#24292e" });
      await Stat.create({
        userId: userA._id,
        categoryId: category._id,
        name: "Total Commits",
        value: "1",
        pinned: true,
        integrationId: integration._id,
        integrationStatId: statId,
      });

      await autoSyncStats(userA._id, integration._id);

      const versions = await Stat.find({ userId: userA._id, integrationStatId: statId }).sort({ createdAt: 1 });
      expect(versions.map((v) => [v.value, v.current])).toEqual([
        ["1", false],
        ["20", true],
      ]);
      expect(versions[1].pinned).toBe(true);
      expect(versions[1].numericValue).toBe(20);
    });
  });

  describe("repairActivatedStats", () => {
    it("should re-link connections that reference stat ids which no longer exist", async () => {
      const updated = await ensureGithubStats(integration._id);
      const staleId = new mongoose.Types.ObjectId();
      const connection = await IntegrationUser.create({ userId: userA._id, integrationId: integration._id, activedStat: [staleId] });
      const stat = await Stat.create({
        userId: userA._id,
        categoryId: new mongoose.Types.ObjectId(),
        name: "Total Stars",
        value: "1",
        integrationId: integration._id,
        integrationStatId: staleId,
      });

      const activated = await repairActivatedStats(connection.toObject(), updated);

      const starsId = updated.availableStats.find((s) => s.name === "Total Stars")._id.toString();
      expect(activated).toEqual([starsId]);
      expect((await Stat.findById(stat._id)).integrationStatId.toString()).toBe(starsId);
      expect((await IntegrationUser.findById(connection._id)).activedStat.map(String)).toEqual([starsId]);
    });
  });
});
