import { describe, it, expect } from "vitest";
import { DAY, bestValue, dayNumber, findRecords, goalPace, streaks, weekChange } from "../../../src/utils/insights.js";

const NOW = Date.UTC(2026, 10, 5, 12);
const at = (daysAgo, value) => ({ numericValue: value, createdAt: new Date(NOW - daysAgo * DAY) });

describe("Dashboard insights", () => {
  describe("dayNumber", () => {
    it("should use the viewer's time zone", () => {
      // 23:30 UTC on Nov 4 is already Nov 5 in Paris
      const late = Date.UTC(2026, 10, 4, 23, 30);
      expect(dayNumber(late, "Europe/Paris")).toBe(dayNumber(late, "UTC") + 1);
    });
  });

  describe("streaks", () => {
    it("should keep the current streak alive until the end of today", () => {
      expect(streaks([10, 11, 12], 12)).toEqual({ current: 3, best: 3, today: true });
      expect(streaks([10, 11, 12], 13)).toEqual({ current: 3, best: 3, today: false });
    });

    it("should reset the current streak after a missed day but keep the best one", () => {
      expect(streaks([1, 2, 3, 4, 8, 8, 9], 11)).toEqual({ current: 0, best: 4, today: false });
      expect(streaks([], 5)).toEqual({ current: 0, best: 0, today: false });
    });
  });

  describe("weekChange", () => {
    it("should compare with the last value logged a week ago or more", () => {
      const change = weekChange([at(20, 50), at(9, 100), at(3, 110), at(0, 120)], "increase", NOW);
      expect(change).toMatchObject({ from: 100, to: 120, delta: 20, percent: 20, better: true });
    });

    it("should compare with the first value of a stat newer than a week", () => {
      expect(weekChange([at(5, 82), at(1, 80)], "decrease", NOW)).toMatchObject({ from: 82, to: 80, better: true });
      expect(weekChange([at(5, 82), at(1, 80)], "increase", NOW)).toMatchObject({ better: false });
    });

    it("should return null without anything to compare", () => {
      expect(weekChange([at(1, 5)], "increase", NOW)).toBeNull();
      expect(weekChange([at(10, 5), at(9, null)], "increase", NOW)).toBeNull();
    });
  });

  describe("findRecords", () => {
    it("should find every value that beats all the previous ones", () => {
      const records = findRecords([at(5, 10), at(4, 12), at(3, 11), at(2, 15)], "increase");
      expect(records.map((r) => [r.previous, r.value])).toEqual([
        [10, 12],
        [12, 15],
      ]);
    });

    it("should follow the goal direction", () => {
      expect(findRecords([at(3, 300), at(2, 290), at(1, 295)], "decrease").map((r) => r.value)).toEqual([290]);
      expect(bestValue([at(3, 300), at(2, 290)], "decrease")).toBe(290);
    });
  });

  describe("goalPace", () => {
    const versions = [at(30, 0), at(0, 30)]; // 1 per day

    it("should be on track when the trend meets the target before the deadline", () => {
      const pace = goalPace(versions, { target: 40, deadline: new Date(NOW + 20 * DAY) }, NOW);
      expect(pace.status).toBe("on_track");
      expect(pace.eta.getTime()).toBe(NOW + 10 * DAY);
    });

    it("should be behind when the trend is too slow", () => {
      expect(goalPace(versions, { target: 100, deadline: new Date(NOW + 20 * DAY) }, NOW).status).toBe("behind");
    });

    it("should handle reached, stalled and open-ended goals", () => {
      expect(goalPace(versions, { target: 25 }, NOW).status).toBe("reached");
      expect(goalPace([at(10, 30), at(0, 30)], { target: 40 }, NOW).status).toBe("stalled");
      expect(goalPace(versions, { target: 40 }, NOW).status).toBe("no_deadline");
      expect(goalPace([at(10, 80), at(0, 78)], { target: 75, direction: "decrease" }, NOW).status).toBe("no_deadline");
    });
  });
});
