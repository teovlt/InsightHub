import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { app } from "../../../src/app.js";
import { User } from "../../../src/models/userModel.js";
import { Category } from "../../../src/models/categoryModel.js";
import { Stat } from "../../../src/models/statModel.js";
import { regularUser, userWithHashPassword } from "../../fixtures/users.js";
import { authCookie } from "../../helpers.js";

describe("Stats", () => {
  let owner;
  let other;
  let category;
  let stat;

  beforeEach(async () => {
    owner = await User.create(regularUser);
    other = await User.create(userWithHashPassword);
    category = await Category.create({ name: "Health", description: "d", icon: "Heart", color: "#ff0000" });
    stat = await Stat.create({ userId: owner._id, categoryId: category._id, name: "Weight", value: "80" });
  });

  it("should create a stat for the connected user", async () => {
    const response = await request(app)
      .post("/api/stats")
      .set("Cookie", authCookie(owner))
      .send({ name: "Steps", value: 1000, categoryId: category._id.toString(), userId: other._id.toString() });

    expect(response.status).toBe(201);
    expect(response.body.stat.value).toBe("1000");
    expect(response.body.stat.userId).toBe(owner._id.toString());
  });

  it("should refuse a stat in a category that does not exist", async () => {
    const response = await request(app)
      .post("/api/stats")
      .set("Cookie", authCookie(owner))
      .send({ name: "Steps", value: "1", categoryId: new mongoose.Types.ObjectId().toString() });

    expect(response.status).toBe(404);
  });

  it("should reject an invalid category id", async () => {
    const response = await request(app)
      .post("/api/stats")
      .set("Cookie", authCookie(owner))
      .send({ name: "Steps", value: "1", categoryId: "nope" });

    expect(response.status).toBe(400);
  });

  it("should let the owner update their stat and keep history", async () => {
    const response = await request(app).put(`/api/stats/${stat._id}`).set("Cookie", authCookie(owner)).send({ value: "79" });

    expect(response.status).toBe(200);
    expect(await Stat.countDocuments({ userId: owner._id, name: "Weight" })).toBe(2);
  });

  it("should not let another user update the stat (IDOR)", async () => {
    const response = await request(app).put(`/api/stats/${stat._id}`).set("Cookie", authCookie(other)).send({ value: "1" });

    expect(response.status).toBe(404);
    expect((await Stat.findById(stat._id)).value).toBe("80");
  });

  it("should not let another user delete the stat (IDOR)", async () => {
    const response = await request(app).delete(`/api/stats/${stat._id}`).set("Cookie", authCookie(other));

    expect(response.status).toBe(400);
    expect(await Stat.exists({ _id: stat._id })).toBeTruthy();
  });

  it("should not let another user roll the stat back (IDOR)", async () => {
    const response = await request(app).post(`/api/stats/rollback/${stat._id}`).set("Cookie", authCookie(other));

    expect(response.status).toBe(404);
    expect(await Stat.exists({ _id: stat._id })).toBeTruthy();
  });

  it("should let the owner delete their stat", async () => {
    const response = await request(app).delete(`/api/stats/${stat._id}`).set("Cookie", authCookie(owner));

    expect(response.status).toBe(200);
    expect(await Stat.exists({ _id: stat._id })).toBeFalsy();
  });

  it("should answer 400 instead of 500 for a malformed id", async () => {
    const response = await request(app).delete("/api/stats/not-an-id").set("Cookie", authCookie(owner));

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("server.global.errors.invalid_id");
  });

  it("should roll back to the previous value even after a rename", async () => {
    let current = (await request(app).put(`/api/stats/${stat._id}`).set("Cookie", authCookie(owner)).send({ value: "79" })).body.stat;
    current = (await request(app).put(`/api/stats/${current._id}`).set("Cookie", authCookie(owner)).send({ value: "78" })).body.stat;
    await request(app).put(`/api/stats/${current._id}`).set("Cookie", authCookie(owner)).send({ name: "Mass", value: "78" });
    // The oldest version is now the most recently updated one
    await Stat.collection.updateOne({ _id: stat._id }, { $set: { updatedAt: new Date(Date.now() + 60_000) } });

    const response = await request(app).post(`/api/stats/rollback/${current._id}`).set("Cookie", authCookie(owner));

    expect(response.status).toBe(200);
    expect(response.body.stat.value).toBe("79");
  });

  it("should delete the stats of a deleted category", async () => {
    await User.updateOne({ _id: other._id }, { role: "admin" });

    const response = await request(app).delete(`/api/categories/${category._id}`).set("Cookie", authCookie(other));

    expect(response.status).toBe(200);
    expect(await Stat.countDocuments({ categoryId: category._id })).toBe(0);
  });
  it("should derive a numeric value from the stored string", async () => {
    const response = await request(app)
      .post("/api/stats")
      .set("Cookie", authCookie(owner))
      .send({ name: "Pace", value: "5:12", categoryId: category._id.toString() });

    expect(response.body.stat.type).toBe("duration");
    expect(response.body.stat.numericValue).toBe(312);
    expect(stat.type).toBe("number");
    expect(stat.numericValue).toBe(80);
  });

  it("should keep pin and goal on the new version after an update", async () => {
    await request(app).patch(`/api/stats/${stat._id}/pin`).set("Cookie", authCookie(owner)).send({ pinned: true });
    await request(app).patch(`/api/stats/${stat._id}/goal`).set("Cookie", authCookie(owner)).send({ target: 75 });

    const response = await request(app).put(`/api/stats/${stat._id}`).set("Cookie", authCookie(owner)).send({ value: "79" });

    expect(response.body.stat.pinned).toBe(true);
    expect(response.body.stat.goal.target).toBe(75);
  });

  it("should refuse a goal on a text stat", async () => {
    const text = await Stat.create({ userId: owner._id, categoryId: category._id, name: "Mood", value: "great" });

    const response = await request(app).patch(`/api/stats/${text._id}/goal`).set("Cookie", authCookie(owner)).send({ target: 10 });

    expect(response.status).toBe(400);
  });

  it("should clear a goal", async () => {
    await request(app).patch(`/api/stats/${stat._id}/goal`).set("Cookie", authCookie(owner)).send({ target: 75 });

    const response = await request(app).patch(`/api/stats/${stat._id}/goal`).set("Cookie", authCookie(owner)).send({ target: null });

    expect(response.status).toBe(200);
    expect(response.body.stat.goal?.target).toBeUndefined();
  });

  it("should not let another user pin, set a goal or read the history (IDOR)", async () => {
    const pin = await request(app).patch(`/api/stats/${stat._id}/pin`).set("Cookie", authCookie(other)).send({ pinned: true });
    const goal = await request(app).patch(`/api/stats/${stat._id}/goal`).set("Cookie", authCookie(other)).send({ target: 1 });
    const history = await request(app).get(`/api/stats/${stat._id}/history`).set("Cookie", authCookie(other));

    expect([pin.status, goal.status, history.status]).toEqual([404, 404, 404]);
  });

  it("should return the history oldest first", async () => {
    const current = (await request(app).put(`/api/stats/${stat._id}`).set("Cookie", authCookie(owner)).send({ value: "79" })).body.stat;

    const response = await request(app).get(`/api/stats/${current._id}/history`).set("Cookie", authCookie(owner));

    expect(response.status).toBe(200);
    expect(response.body.history.map((h) => h.numericValue)).toEqual([80, 79]);
  });

  it("should give the dashboard its pinned stats with history, goals and recent changes", async () => {
    await request(app).patch(`/api/stats/${stat._id}/pin`).set("Cookie", authCookie(owner)).send({ pinned: true });
    await request(app).patch(`/api/stats/${stat._id}/goal`).set("Cookie", authCookie(owner)).send({ target: 75 });
    await request(app).put(`/api/stats/${stat._id}`).set("Cookie", authCookie(owner)).send({ value: "79" });
    await Stat.create({ userId: other._id, categoryId: category._id, name: "Other", value: "1", pinned: true });

    const response = await request(app).get("/api/stats/overview").set("Cookie", authCookie(owner));

    expect(response.status).toBe(200);
    expect(response.body.pinned).toHaveLength(1);
    expect(response.body.pinned[0].history.map((h) => h.value)).toEqual(["80", "79"]);
    expect(response.body.pinned[0].categoryId.name).toBe("Health");
    expect(response.body.goals).toHaveLength(1);
    expect(response.body.recent.every((s) => s.userId === owner._id.toString())).toBe(true);
  });
});
