import { describe, it, expect, vitest, beforeEach } from "vitest";
import request from "supertest";
import { User } from "../../../src/models/userModel.js";

//Import server and app
import { app } from "../../../src/app.js";
import {
  badConfirmPasswordRegisterUser,
  badPasswordRegisterUser,
  registerUser,
  regularUser,
  userWithHashPassword,
  userWithSameEmail,
  userWithSameUsername,
} from "../../fixtures/users.js";
import { authTypes } from "../../../src/utils/enums/authTypes.js";
import { userRoles } from "../../../src/utils/enums/userRoles.js";
import { authCookie, getAuthSetCookie, mockGoogleToken } from "../../helpers.js";

describe("POST /api/auth/register", () => {
  it("should return a 201 status, create an account and store the token in an httpOnly cookie", async () => {
    const response = await request(app).post("/api/auth/register").send(registerUser);
    expect(response.status).toBe(201);
    const cookie = getAuthSetCookie(response);
    expect(cookie).toBeDefined();
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(response.body.message).toBe("server.auth.messages.register_success");
    expect(response.body.user).toHaveProperty("_id" && "username" && "email");
    expect(response.body.user.auth_type).toBe(authTypes.LOCAL);
    expect(response.body.user.password).toBe(undefined);
    expect(response.body.user.tokenVersion).toBe(undefined);
    expect(response.body.accessToken).toBe(undefined);
    expect(response.body.user.avatar).toContain(".svg");
  });

  it("should make the first registered user an admin, and the next ones regular users", async () => {
    const first = await request(app).post("/api/auth/register").send(registerUser);
    const second = await request(app)
      .post("/api/auth/register")
      .send({ ...registerUser, username: "second", email: "second@gmail.com" });

    expect(first.body.user.role).toBe(userRoles.ADMIN);
    expect(second.body.user.role).toBe(userRoles.USER);
  });

  it("should ignore fields the client must not set (role, auth_type, photoURL)", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({ ...registerUser, auth_type: authTypes.GOOGLE, photoURL: "https://evil.example/x.png", tokenVersion: 99 });

    expect(response.status).toBe(201);
    expect(response.body.user.auth_type).toBe(authTypes.LOCAL);
    expect(response.body.user.avatar).toContain(".svg");
  });

  it("should create a Google account when a valid ID token matches the email", async () => {
    mockGoogleToken({ email: registerUser.email });

    const response = await request(app)
      .post("/api/auth/register")
      .send({ ...registerUser, idToken: "valid-token" });

    expect(response.status).toBe(201);
    expect(response.body.user.auth_type).toBe(authTypes.GOOGLE);
    expect(response.body.user.avatar).toContain(".jpg");
  });

  it("should create a Google account without asking for a password", async () => {
    mockGoogleToken({ email: registerUser.email });
    const { password, confirmPassword, ...withoutPassword } = registerUser;

    const response = await request(app)
      .post("/api/auth/register")
      .send({ ...withoutPassword, idToken: "valid-token" });

    expect(response.status).toBe(201);
    expect(response.body.user.auth_type).toBe(authTypes.GOOGLE);
    expect(getAuthSetCookie(response)).toBeDefined();
    const stored = await User.findOne({ email: registerUser.email }).select("+password");
    expect(stored.password).toBeUndefined();
  });

  it("should not store a password sent with a Google registration", async () => {
    mockGoogleToken({ email: registerUser.email });

    await request(app)
      .post("/api/auth/register")
      .send({ ...registerUser, idToken: "valid-token" });

    const stored = await User.findOne({ email: registerUser.email }).select("+password");
    expect(stored.password).toBeUndefined();
  });

  it("should still require a password for an email registration", async () => {
    const { password, confirmPassword, ...withoutPassword } = registerUser;

    const response = await request(app).post("/api/auth/register").send(withoutPassword);

    expect(response.status).toBe(422);
    expect(response.body.error).toBe("server.global.errors.missing_fields");
    expect(await User.countDocuments()).toBe(0);
  });

  it("should let a Google account without a password sign in with Google, never with a password", async () => {
    mockGoogleToken({ email: registerUser.email });
    const { password, confirmPassword, ...withoutPassword } = registerUser;
    await request(app)
      .post("/api/auth/register")
      .send({ ...withoutPassword, idToken: "valid-token" });

    mockGoogleToken({ email: registerUser.email });
    const google = await request(app).post("/api/auth/login/google").send({ idToken: "valid-token" });
    expect(google.status).toBe(200);

    const withPassword = await request(app).post("/api/auth/login").send({ email: registerUser.email, password: "Abcdef1@" });
    expect(withPassword.status).toBe(400);
    expect(withPassword.body.error).toBe("server.auth.errors.invalid_credentials");
  });

  it("should refuse a Google registration whose token was issued for another email", async () => {
    mockGoogleToken({ email: "someone-else@gmail.com" });

    const response = await request(app)
      .post("/api/auth/register")
      .send({ ...registerUser, idToken: "valid-token" });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("server.auth.errors.google_token_invalid");
    expect(await User.countDocuments()).toBe(0);
  });

  it("should refuse a Google registration with an invalid token", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({ ...registerUser, idToken: "forged-token" });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("server.auth.errors.google_token_invalid");
  });

  it("should return a 400 status error because the password isnt strong enough", async () => {
    const response = await request(app).post("/api/auth/register").send(badPasswordRegisterUser);
    expect(response.status).toBe(400);
    expect(response.body.error).toBe("server.auth.errors.regex");
  });

  it("should return a 400 status error because the passwords do not match", async () => {
    const response = await request(app).post("/api/auth/register").send(badConfirmPasswordRegisterUser);
    expect(response.status).toBe(400);
    expect(response.body.error).toBe("server.auth.errors.password_no_match");
  });

  it("should return a 409 status error because the email is already taken", async () => {
    await User.create(userWithSameUsername);
    const response = await request(app).post("/api/auth/register").send(registerUser);
    expect(response.status).toBe(409);
    expect(response.body.error).toBe("server.auth.errors.email_taken");
  });

  it("should return a 409 status error because the username is already taken", async () => {
    await User.create(userWithSameEmail);
    const response = await request(app).post("/api/auth/register").send(registerUser);
    expect(response.status).toBe(409);
    expect(response.body.error).toBe("server.auth.errors.username_taken");
  });

  it("should return a 422 status error because of missing fields", async () => {
    const response = await request(app).post("/api/auth/register").send(regularUser);
    expect(response.status).toBe(422);
    expect(response.body.error).toBe("server.global.errors.missing_fields");
  });

  it("should return a 400 status error when a field has the wrong type (NoSQL injection attempt)", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({ ...registerUser, email: { $ne: null } });
    expect(response.status).toBe(400);
    expect(response.body.error).toBe("server.global.errors.invalid_fields");
  });

  it("should return a generic 500 status error without leaking the internal error", async () => {
    vitest.spyOn(User, "findOne").mockImplementationOnce(() => {
      throw new Error("Test error");
    });

    const response = await request(app).post("/api/auth/register").send(registerUser);

    expect(response.status).toBe(500);
    expect(response.body.error).toBe("server.global.errors.internal");
  });
});

describe("POST /api/auth/login", () => {
  beforeEach(async () => {
    await User.create({ ...userWithHashPassword, username: "user", email: "user@gmail.com" });
  });

  it("should return a 200 status when logging in with email and store the token in a cookie", async () => {
    const response = await request(app).post("/api/auth/login").send({
      email: "user@gmail.com",
      password: "Abcdef1@",
    });

    expect(response.status).toBe(200);
    expect(getAuthSetCookie(response)).toContain("HttpOnly");
    expect(response.body.message).toBe("server.auth.messages.login_success");
    expect(response.body.user).toHaveProperty("_id" && "username" && "email");
    expect(response.body.user.password).toBe(undefined);
    expect(response.body.accessToken).toBe(undefined);
  });

  it("should return a 200 status when logging in with username", async () => {
    const response = await request(app).post("/api/auth/login").send({
      username: "user",
      password: "Abcdef1@",
    });

    expect(response.status).toBe(200);
    expect(getAuthSetCookie(response)).toBeDefined();
  });

  it("should return a 422 error status because the password is missing", async () => {
    const response = await request(app).post("/api/auth/login").send({
      username: "test",
    });
    expect(response.status).toBe(422);
    expect(response.body.error).toBe("server.global.errors.missing_fields");
  });

  it("should return a 422 error status because the login is missing", async () => {
    const response = await request(app).post("/api/auth/login").send({
      password: "test",
    });
    expect(response.status).toBe(422);
    expect(response.body.error).toBe("server.global.errors.missing_fields");
  });

  it("should answer the same way for an unknown user and a wrong password (no user enumeration)", async () => {
    const unknown = await request(app).post("/api/auth/login").send({
      username: "testFALSE",
      password: "Abcdef1@",
    });
    const wrongPassword = await request(app).post("/api/auth/login").send({
      username: "user",
      password: "Abcdef1@FALSE",
    });

    expect(unknown.status).toBe(400);
    expect(wrongPassword.status).toBe(400);
    expect(unknown.body.error).toBe("server.auth.errors.invalid_credentials");
    expect(wrongPassword.body.error).toBe("server.auth.errors.invalid_credentials");
  });

  it("should reject operator objects instead of querying with them", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ username: { $ne: null }, password: "x" });

    expect(response.status).toBe(400);
    expect(getAuthSetCookie(response)).toBeUndefined();
  });

  it("should return a generic 500 error status because of an internal error", async () => {
    vitest.spyOn(User, "findOne").mockImplementationOnce(() => {
      throw new Error("Test error");
    });

    const response = await request(app).post("/api/auth/login").send({
      username: "test",
      password: "testPassword",
    });

    expect(response.status).toBe(500);
    expect(response.body.error).toBe("server.global.errors.internal");
  });
});

describe("POST /api/auth/login/google", () => {
  beforeEach(async () => {
    await User.create({ ...userWithHashPassword, username: "user", email: "user@gmail.com" });
  });

  it("should log in the user whose email is in the verified token", async () => {
    mockGoogleToken({ email: "user@gmail.com" });

    const response = await request(app).post("/api/auth/login/google").send({ idToken: "valid-token" });

    expect(response.status).toBe(200);
    expect(getAuthSetCookie(response)).toBeDefined();
    expect(response.body.message).toBe("server.auth.messages.login_success");
    expect(response.body.user.email).toBe("user@gmail.com");
  });

  it("should not log in from an email in the body (account takeover)", async () => {
    const response = await request(app).post("/api/auth/login/google").send({ email: "user@gmail.com" });

    expect(response.status).toBe(422);
    expect(getAuthSetCookie(response)).toBeUndefined();
  });

  it("should refuse an invalid token", async () => {
    const response = await request(app).post("/api/auth/login/google").send({ idToken: "forged-token" });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("server.auth.errors.google_token_invalid");
    expect(getAuthSetCookie(response)).toBeUndefined();
  });

  it("should refuse a token whose email is not verified", async () => {
    mockGoogleToken({ email: "user@gmail.com", email_verified: false });

    const response = await request(app).post("/api/auth/login/google").send({ idToken: "valid-token" });

    expect(response.status).toBe(401);
  });

  it("should refuse a token that does not come from a Google sign-in", async () => {
    mockGoogleToken({ email: "user@gmail.com", firebase: { sign_in_provider: "password" } });

    const response = await request(app).post("/api/auth/login/google").send({ idToken: "valid-token" });

    expect(response.status).toBe(401);
  });

  it("should return a 404 error status because the user does not exist", async () => {
    mockGoogleToken({ email: "inconnu@gmail.com" });

    const response = await request(app).post("/api/auth/login/google").send({ idToken: "valid-token" });

    expect(response.status).toBe(404);
    expect(response.body.error).toBe("User not found, lets register !");
  });

  it("should return a generic 500 error status because of an internal error", async () => {
    mockGoogleToken({ email: "user@gmail.com" });
    vitest.spyOn(User, "findOne").mockImplementationOnce(() => {
      throw new Error("Test error");
    });

    const response = await request(app).post("/api/auth/login/google").send({ idToken: "valid-token" });

    expect(response.status).toBe(500);
    expect(response.body.error).toBe("server.global.errors.internal");
  });
});

describe("POST /api/auth/logout", () => {
  it("should return a 200 status and clear the auth cookie", async () => {
    const user = await User.create(regularUser);
    const response = await request(app).post("/api/auth/logout").set("Cookie", authCookie(user));

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("server.auth.messages.logout_success");
    expect(getAuthSetCookie(response).startsWith("__access__token=;")).toBe(true);
  });

  it("should reject a logout triggered from another site (CSRF)", async () => {
    const response = await request(app).post("/api/auth/logout").set("Origin", "https://evil.example");

    expect(response.status).toBe(403);
    expect(response.body.error).toBe("server.global.errors.forbidden");
  });
});

describe("POST /api/auth/logout/everywhere", () => {
  it("should revoke every token issued before", async () => {
    const user = await User.create(regularUser);
    const cookie = authCookie(user);

    const response = await request(app).post("/api/auth/logout/everywhere").set("Cookie", cookie);

    expect(response.status).toBe(200);
    expect(getAuthSetCookie(response).startsWith("__access__token=;")).toBe(true);
    const me = await request(app).get("/api/auth/me").set("Cookie", cookie);
    expect(me.status).toBe(401);
  });

  it("should require authentication", async () => {
    const response = await request(app).post("/api/auth/logout/everywhere");

    expect(response.status).toBe(401);
  });
});

describe("GET /api/auth/me", () => {
  let user;
  beforeEach(async () => {
    user = await User.create(regularUser);
  });

  it("should return a 200 status and the connected user infos", async () => {
    const response = await request(app).get("/api/auth/me").set("Cookie", authCookie(user));
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("_id" && "username" && "email");
    expect(response.body.password).toBe(undefined);
    expect(response.body.tokenVersion).toBe(undefined);
  });

  it("should not accept a token sent in the Authorization header anymore", async () => {
    const token = authCookie(user).split("=")[1];
    const response = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`);
    expect(response.status).toBe(401);
  });

  it("should return a generic 500 status in case of an internal error", async () => {
    vitest.spyOn(User, "findById").mockImplementationOnce(() => {
      throw new Error("Test error");
    });

    const response = await request(app).get("/api/auth/me").set("Cookie", authCookie(user));

    expect(response.status).toBe(500);
    expect(response.body.error).toBe("server.global.errors.internal");
  });
});
