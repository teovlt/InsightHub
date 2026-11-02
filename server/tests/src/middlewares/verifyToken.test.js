import mongoose from "mongoose";
import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { User } from "../../../src/models/userModel";
import { app } from "../../../src/app";
import { regularUser } from "../../fixtures/users";
import { authCookie } from "../../helpers";

describe("verifyToken Middleware", () => {
  it("should return 401 if no token is provided", async () => {
    const res = await request(app).get("/api/users/").send();

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Not Authenticated");
  });

  it("should return 401 if the token is invalid", async () => {
    const res = await request(app).get("/api/users/").set("Cookie", "__access__token=invalidtoken").send();

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Access Token is invalid");
  });

  it("should return 401 if the token is signed with another secret", async () => {
    const user = await User.create(regularUser);
    const forged = jwt.sign({ id: user._id, v: 0 }, "not-the-server-secret");

    const res = await request(app).get("/api/auth/me").set("Cookie", `__access__token=${forged}`);

    expect(res.status).toBe(401);
  });

  it("should call next middleware if the token is valid and no role is required", async () => {
    const user = await User.create(regularUser);

    const res = await request(app).get("/api/auth/me/").set("Cookie", authCookie(user)).send();

    expect(res.status).toBe(200);
  });

  it("should return 401 if the user does not exist", async () => {
    const token = jwt.sign({ id: new mongoose.Types.ObjectId(), v: 0 }, process.env.SECRET_ACCESS_TOKEN);

    const res = await request(app).get("/api/users").set("Cookie", `__access__token=${token}`).send();

    expect(res.status).toBe(401);
  });

  it("should return 401 if the token was revoked (tokenVersion bumped)", async () => {
    const user = await User.create(regularUser);
    const cookie = authCookie(user);
    await User.updateOne({ _id: user._id }, { $inc: { tokenVersion: 1 } });

    const res = await request(app).get("/api/auth/me").set("Cookie", cookie);

    expect(res.status).toBe(401);
  });

  it("should return 403 if the user is not admin for admin routes", async () => {
    const user = await User.create(regularUser);

    const res = await request(app).get("/api/users/").set("Cookie", authCookie(user));

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Access restricted");
  });

  it("should return a generic 500 status error when there is a database error", async () => {
    const user = await User.create(regularUser);
    const cookie = authCookie(user);

    const findByIdMock = vi.spyOn(User, "findById").mockImplementation(() => {
      throw new Error("Database error");
    });

    const res = await request(app).get("/api/users/").set("Cookie", cookie).send();

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("server.global.errors.internal");

    findByIdMock.mockRestore();
  });
});
