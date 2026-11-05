import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { User } from "../../../src/models/userModel.js";
import { Integration } from "../../../src/models/integrationModel.js";
import { IntegrationUser } from "../../../src/models/integrationUser.js";
import { Stat } from "../../../src/models/statModel.js";
import { encrypt } from "../../../src/utils/crypto.js";
import { ensureProviderStats } from "../../../src/integrations/ensure.js";
import { lichess } from "../../../src/integrations/providers/games.js";
import { findDueConnections, getBackgroundSyncInterval, runBackgroundSync, RETRY_DELAY } from "../../../src/integrations/scheduler.js";
import { regularUser, userWithHashPassword } from "../../fixtures/users.js";

const HOUR = 60 * 60 * 1000;
const ago = (ms) => new Date(Date.now() - ms);

// Lichess public profile: every stat has a value
const mockLichess = (ok = true) =>
  vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
    ok
      ? new Response(
          JSON.stringify({
            perfs: { blitz: { rating: 1500 }, rapid: { rating: 1600 }, puzzle: { rating: 1700 } },
            count: { all: 42 },
            playTime: { total: 7200 },
          }),
          { status: 200 },
        )
      : new Response("down", { status: 503 }),
  );

describe("Background sync scheduler", () => {
  let user;
  let otherUser;
  let integration;

  beforeEach(async () => {
    user = await User.create(regularUser);
    otherUser = await User.create(userWithHashPassword);
    const created = await Integration.create({ name: "Lichess", provider: "lichess", status: "available" });
    integration = await ensureProviderStats(created._id, lichess);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const connect = (owner, fields = {}) =>
    IntegrationUser.create({
      userId: owner._id,
      integrationId: integration._id,
      accessToken: encrypt("magnus"),
      config: { account: "magnus" },
      activedStat: integration.availableStats.map((stat) => stat._id),
      ...fields,
    });

  it("should pick never synced and stale connections only", async () => {
    const never = await connect(user);
    const stale = await connect(otherUser, { lastSyncedAt: ago(getBackgroundSyncInterval() + HOUR) });

    const third = await User.create({ ...regularUser, email: "fresh@test.com", username: "fresh" });
    await connect(third, { lastSyncedAt: ago(HOUR) });

    const due = await findDueConnections();

    expect(due.map((c) => c._id.toString()).sort()).toEqual([never._id.toString(), stale._id.toString()].sort());
  });

  it("should skip disconnected connections, disabled integrations and recent failed attempts", async () => {
    await connect(user, { connected: false });
    await connect(otherUser, { lastSyncAttemptAt: ago(RETRY_DELAY / 2) });

    expect(await findDueConnections()).toHaveLength(0);

    await IntegrationUser.updateMany({}, { connected: true, $unset: { lastSyncAttemptAt: 1 } });
    await Integration.updateOne({ _id: integration._id }, { status: "disabled" });

    expect(await findDueConnections()).toHaveLength(0);
  });

  it("should sync due connections and create their stats", async () => {
    mockLichess();
    const connection = await connect(user);

    const result = await runBackgroundSync();

    expect(result).toEqual({ synced: 1, failed: 0 });
    const updated = await IntegrationUser.findById(connection._id).lean();
    expect(updated.lastSyncedAt).toBeInstanceOf(Date);
    expect(updated.lastSyncAttemptAt).toBeInstanceOf(Date);
    const stats = await Stat.find({ userId: user._id, integrationId: integration._id, current: true }).lean();
    expect(stats.find((stat) => stat.name === "Blitz rating")?.value).toBe("1500");

    // Fresh now: the next run has nothing to do
    expect(await runBackgroundSync()).toEqual({ synced: 0, failed: 0 });
  });

  it("should not retry a failing service on the next run", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const fetchSpy = mockLichess(false);
    const connection = await connect(user);

    expect(await runBackgroundSync()).toEqual({ synced: 0, failed: 1 });
    const calls = fetchSpy.mock.calls.length;

    expect(await runBackgroundSync()).toEqual({ synced: 0, failed: 0 });
    expect(fetchSpy.mock.calls.length).toBe(calls);

    const updated = await IntegrationUser.findById(connection._id).lean();
    expect(updated.lastSyncedAt).toBeUndefined();
    expect(updated.lastSyncAttemptAt).toBeInstanceOf(Date);
  });
});
