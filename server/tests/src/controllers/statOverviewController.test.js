import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../../src/app.js";
import { User } from "../../../src/models/userModel.js";
import { Category } from "../../../src/models/categoryModel.js";
import { Stat } from "../../../src/models/statModel.js";
import { UserAchievement } from "../../../src/models/userAchievementModel.js";
import { regularUser, userWithHashPassword } from "../../fixtures/users.js";
import { authCookie } from "../../helpers.js";

const DAY = 24 * 60 * 60 * 1000;

describe("Dashboard overview", () => {
  let owner;
  let other;
  let category;

  beforeEach(async () => {
    owner = await User.create(regularUser);
    other = await User.create(userWithHashPassword);
    category = await Category.create({ name: "Sport", description: "d", icon: "Dumbbell", color: "#ff0000" });
  });

  // Creates the versions of a stat, oldest first; the last one is current
  const track = async (user, name, points, extra = {}) => {
    const docs = [];
    for (const [i, [daysAgo, value]] of points.entries()) {
      const current = i === points.length - 1;
      const doc = await Stat.create({ userId: user._id, categoryId: category._id, name, value: String(value), current, ...extra });
      // Raw driver update: timestamps would otherwise reset createdAt
      await Stat.collection.updateOne({ _id: doc._id }, { $set: { createdAt: new Date(Date.now() - daysAgo * DAY) } });
      docs.push(doc);
    }
    return docs.at(-1);
  };

  const getOverview = (user) => request(app).get("/api/stats/overview?tz=Europe/Paris").set("Cookie", authCookie(user));

  it("should summarize the week with streaks, highlights and records", async () => {
    await track(owner, "Pushups", [
      [10, 20],
      [2, 25],
      [1, 30],
      [0, 40],
    ]);
    await track(
      owner,
      "Weight",
      [
        [12, 82],
        [0, 80],
      ],
      { goal: { target: 75, direction: "decrease", start: 82 } },
    );
    await track(other, "Pushups", [
      [1, 1],
      [0, 999],
    ]);

    const response = await getOverview(owner);

    expect(response.status).toBe(200);
    const { week, highlights, moments, goals } = response.body;
    expect(week.values).toBe(4);
    expect(week.streak).toMatchObject({ current: 3, today: true });
    expect(highlights.map((h) => h.name)).toEqual(["Pushups", "Weight"]);
    expect(highlights[0].week).toMatchObject({ from: 20, to: 40, percent: 100, better: true });
    // Losing weight is progress for a "decrease" goal
    expect(highlights[1].week.better).toBe(true);
    // Newest first; the two values of today were saved milliseconds apart
    const records = moments.filter((m) => m.kind === "record");
    expect(records.map((m) => m.value).sort((a, b) => a - b)).toEqual([25, 30, 40, 80]);
    expect(records.at(-1).value).toBe(25);
    expect(goals).toHaveLength(1);
    expect(goals[0].pace.status).toBe("no_deadline");
    // Tiers already reached (the 3-day streak) are never offered as the next badge
    expect(response.body.nextBadge.progress).toBeLessThan(response.body.nextBadge.next.threshold);
  });

  it("should suggest manual stats not updated for a week, and never synced ones", async () => {
    await track(owner, "Sleep", [[9, 8]]);
    await track(owner, "Reading", [[1, 10]]);
    await track(owner, "Commits", [[20, 100]], { integrationId: category._id });

    const { toLog } = (await getOverview(owner)).body;

    expect(toLog.map((s) => s.name)).toEqual(["Sleep"]);
    expect(toLog[0].daysAgo).toBe(9);
  });

  it("should show badges among the moments and guide a new account", async () => {
    await UserAchievement.create({ userId: owner._id, achievementId: "stats_created", tier: "bronze", unlockedAt: new Date() });

    const empty = (await getOverview(owner)).body;

    expect(empty.onboarding).toEqual({ connectedApps: 0, stats: 0, goals: 0, done: false });
    expect(empty.moments).toEqual([expect.objectContaining({ kind: "badge", achievementId: "stats_created", tier: "bronze" })]);
    expect(empty.nextBadge).toMatchObject({ id: expect.any(String), next: expect.any(Object) });
    expect(empty.nextBadge.progress).toBeLessThan(empty.nextBadge.next.threshold);
    expect(empty.week.streak.current).toBe(0);
  });

  it("should keep hidden values out of highlights and records", async () => {
    await track(
      owner,
      "Salary",
      [
        [10, 1000],
        [0, 2000],
      ],
      { hided: true, pinned: true },
    );

    const body = (await getOverview(owner)).body;

    expect(body.highlights).toHaveLength(0);
    expect(body.moments).toHaveLength(0);
    expect(body.pinned).toHaveLength(1);
  });
});
