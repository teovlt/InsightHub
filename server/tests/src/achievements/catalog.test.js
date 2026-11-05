import { describe, it, expect } from "vitest";
import { ACHIEVEMENTS, dayKeys, isGoalReached, longestStreak, reachedTiers, tiersOf } from "../../../src/achievements/catalog.js";

const byId = (id) => ACHIEVEMENTS.find((a) => a.id === id);

const empty = { connectedApps: 0, syncedApps: 0, goalsReached: 0, statsCreated: 0, loggedDays: 0, bestStreak: 0 };

describe("Achievement catalog", () => {
  it("should have unique ids and increasing thresholds", () => {
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
    ACHIEVEMENTS.forEach((a) => {
      expect(a.thresholds.length).toBeGreaterThan(0);
      expect(a.thresholds.length).toBeLessThanOrEqual(3);
      expect([...a.thresholds].sort((x, y) => x - y)).toEqual(a.thresholds);
    });
  });

  it("should report zero progress for a brand new user", () => {
    ACHIEVEMENTS.forEach((a) => expect(a.progress(empty)).toBe(0));
    ACHIEVEMENTS.forEach((a) => expect(a.progress({})).toBe(0));
  });

  it.each([
    ["apps_connected", { connectedApps: 3 }, 3],
    ["first_sync", { syncedApps: 2 }, 2],
    ["goals_reached", { goalsReached: 4 }, 4],
    ["stats_created", { statsCreated: 21 }, 21],
    ["days_logged", { loggedDays: 8 }, 8],
    ["streak", { bestStreak: 7 }, 7],
  ])("%s should read its progress from the snapshot", (id, data, expected) => {
    expect(byId(id).progress({ ...empty, ...data })).toBe(expected);
  });

  it("should name tiers bronze, silver, gold in order", () => {
    expect(tiersOf(byId("apps_connected"))).toEqual([
      { tier: "bronze", threshold: 1 },
      { tier: "silver", threshold: 3 },
      { tier: "gold", threshold: 5 },
    ]);
    expect(tiersOf(byId("first_sync"))).toEqual([{ tier: "bronze", threshold: 1 }]);
  });

  it("should reach every tier up to the progress", () => {
    const apps = byId("apps_connected");
    expect(reachedTiers(apps, 0)).toEqual([]);
    expect(reachedTiers(apps, 2)).toEqual(["bronze"]);
    expect(reachedTiers(apps, 3)).toEqual(["bronze", "silver"]);
    expect(reachedTiers(apps, 9)).toEqual(["bronze", "silver", "gold"]);
  });
});

describe("isGoalReached", () => {
  it("should handle goals that go up", () => {
    expect(isGoalReached({ numericValue: 10, goal: { target: 10, direction: "increase" } })).toBe(true);
    expect(isGoalReached({ numericValue: 9, goal: { target: 10, direction: "increase" } })).toBe(false);
    expect(isGoalReached({ numericValue: 12, goal: { target: 10 } })).toBe(true);
  });

  it("should handle goals that go down", () => {
    expect(isGoalReached({ numericValue: 75, goal: { target: 75, direction: "decrease" } })).toBe(true);
    expect(isGoalReached({ numericValue: 80, goal: { target: 75, direction: "decrease" } })).toBe(false);
  });

  it("should ignore stats without a goal or a number", () => {
    expect(isGoalReached({ numericValue: 10 })).toBe(false);
    expect(isGoalReached({ numericValue: null, goal: { target: 1 } })).toBe(false);
  });
});

describe("Logged days and streaks", () => {
  const day = (d, hour = 12) => new Date(Date.UTC(2026, 10, d, hour));

  it("should count each day once", () => {
    expect(dayKeys([day(1, 8), day(1, 20), day(3)]).length).toBe(2);
  });

  it("should find the longest run of consecutive days", () => {
    expect(longestStreak([])).toBe(0);
    expect(longestStreak(dayKeys([day(1)]))).toBe(1);
    expect(longestStreak(dayKeys([day(1), day(2), day(3), day(5), day(6)]))).toBe(3);
    expect(longestStreak(dayKeys([day(1), day(3), day(4), day(5), day(6), day(9)]))).toBe(4);
  });
});
