import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { User } from "../../../src/models/userModel.js";
import { Integration } from "../../../src/models/integrationModel.js";
import { IntegrationUser } from "../../../src/models/integrationUser.js";
import { Stat } from "../../../src/models/statModel.js";
import { encrypt } from "../../../src/utils/crypto.js";
import { ensureGithubStats } from "../../../src/utils/github/integration.js";
import { runScheduledSync, startScheduler, stopScheduler } from "../../../src/integrations/scheduler.js";
import { SYNC_INTERVAL } from "../../../src/utils/stats.js";
import { regularUser, userWithHashPassword } from "../../fixtures/users.js";

const currentYear = new Date().getUTCFullYear();

// Fake GitHub GraphQL API; a token listed in failingTokens gets a network error instead
const mockGithub = (failingTokens = []) =>
  vi.spyOn(globalThis, "fetch").mockImplementation(async (_url, options) => {
    const auth = options.headers?.Authorization || options.headers?.authorization || "";
    if (failingTokens.some((token) => auth.includes(token))) throw new Error("GitHub is down");
    const { query } = JSON.parse(options.body);
    let viewer;
    if (query.includes("repositories")) {
      viewer = { repositories: { nodes: [{ stargazerCount: 5 }], pageInfo: { hasNextPage: false, endCursor: null } } };
    } else {
      viewer = {};
      for (const [, year] of query.matchAll(/y(\d{4}):/g)) {
        viewer[`y${year}`] = {
          totalCommitContributions: 10,
          contributionCalendar: { weeks: [{ contributionDays: [{ date: `${year}-01-01`, contributionCount: 1 }] }] },
        };
      }
    }
    return new Response(JSON.stringify({ data: { viewer } }), { status: 200 });
  });

describe("Background sync scheduler", () => {
  let userA;
  let userB;
  let integration;

  beforeEach(async () => {
    userA = await User.create(regularUser);
    userB = await User.create(userWithHashPassword);
    integration = await Integration.create({ name: "GitHub", status: "available", config: { authUrl: "auth/github" } });
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    stopScheduler();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const connect = async (user, fields = {}) => {
    const updated = await ensureGithubStats(integration._id);
    return IntegrationUser.create({
      userId: user._id,
      integrationId: integration._id,
      accessToken: encrypt(`gho_${user._id}`),
      config: { githubUser: { created_at: `${currentYear - 1}-06-01T00:00:00Z` } },
      activedStat: updated.availableStats.map((stat) => stat._id),
      ...fields,
    });
  };

  it("should sync connected integrations only", async () => {
    const fetchSpy = mockGithub();
    await connect(userA);
    await connect(userB, { connected: false, accessToken: undefined });

    const summary = await runScheduledSync();

    expect(summary).toEqual({ synced: 1, skipped: 0, failed: 0 });
    expect(fetchSpy).toHaveBeenCalled();
    expect(await Stat.countDocuments({ userId: userA._id, current: true })).toBeGreaterThan(0);
    expect(await Stat.countDocuments({ userId: userB._id })).toBe(0);
    const synced = await IntegrationUser.findOne({ userId: userA._id }).lean();
    expect(synced.lastSyncedAt).toBeInstanceOf(Date);
  });

  it("should skip integrations synced recently", async () => {
    const fetchSpy = mockGithub();
    await connect(userA, { lastSyncedAt: new Date(Date.now() - 60 * 1000) });
    await connect(userB, { lastSyncedAt: new Date(Date.now() - SYNC_INTERVAL - 60 * 1000) });

    const summary = await runScheduledSync();

    expect(summary).toEqual({ synced: 1, skipped: 0, failed: 0 });
    expect(await Stat.countDocuments({ userId: userA._id })).toBe(0);
    expect(await Stat.countDocuments({ userId: userB._id, current: true })).toBeGreaterThan(0);
    expect(fetchSpy.mock.calls.every(([, options]) => !JSON.stringify(options.headers).includes(String(userA._id)))).toBe(true);
  });

  it("should keep syncing the others when a provider fails", async () => {
    mockGithub([`gho_${userA._id}`]);
    await connect(userA);
    await connect(userB);

    const summary = await runScheduledSync({ concurrency: 1 });

    expect(summary).toEqual({ synced: 1, skipped: 0, failed: 1 });
    expect(await Stat.countDocuments({ userId: userB._id, current: true })).toBeGreaterThan(0);
    // A failed sync stays due, so the next run retries it
    expect((await IntegrationUser.findOne({ userId: userA._id }).lean()).lastSyncedAt).toBeUndefined();
  });

  it("should not start a run while another one is in progress", async () => {
    mockGithub();
    await connect(userA);

    const [first, second] = await Promise.all([runScheduledSync(), runScheduledSync()]);

    expect(first).toEqual({ synced: 1, skipped: 0, failed: 0 });
    expect(second).toBeNull();
  });

  it("should not throw when the database query fails", async () => {
    vi.spyOn(IntegrationUser, "find").mockImplementation(() => {
      throw new Error("DB down");
    });

    await expect(runScheduledSync()).resolves.toEqual({ synced: 0, skipped: 0, failed: 0 });
  });

  it("should run on its interval once started", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    vi.spyOn(console, "log").mockImplementation(() => {});
    const findSpy = vi.spyOn(IntegrationUser, "find").mockImplementation(() => {
      throw new Error("not under test");
    });

    startScheduler({ interval: 1000 });
    startScheduler({ interval: 1000 });
    vi.advanceTimersByTime(1000);

    expect(findSpy).toHaveBeenCalledTimes(1);
    stopScheduler();
    vi.advanceTimersByTime(5000);
    expect(findSpy).toHaveBeenCalledTimes(1);
  });
});
