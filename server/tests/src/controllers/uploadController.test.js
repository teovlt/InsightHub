import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import { User } from "../../../src/models/userModel.js";
import { bucket } from "../../../src/lib/firebase.js";
import { app } from "../../../src/app.js";
import { Constants } from "../../../constants/constants.js";
import { adminUser, regularUser, userAdminWithAvatar } from "../../fixtures/users.js";
import { authCookie } from "../../helpers.js";

const png = { filename: "avatar.png", contentType: "image/png" };

describe("Tests uploads files", () => {
  it("should return an error if no file is provided", async () => {
    const user = await User.create(adminUser);

    const response = await request(app).post(`/api/uploads/avatar/${user._id}`).set("Cookie", authCookie(user));

    expect(response.body.error).toBe("server.upload.errors.no_file");
    expect(response.statusCode).toBe(400);
  });

  it("should send an error if the file type isn't allowed", async () => {
    const user = await User.create(adminUser);

    const response = await request(app)
      .post(`/api/uploads/avatar/${user._id}`)
      .set("Cookie", authCookie(user))
      .attach("avatar", Buffer.from("Hello, world!"), { filename: "hello-world.txt", contentType: "text/plain" });

    expect(response.body.error).toBe("server.upload.errors.invalid_file_type");
    expect(response.statusCode).toBe(400);
  });

  it("should refuse SVG avatars, which can carry scripts", async () => {
    const user = await User.create(adminUser);

    const response = await request(app)
      .post(`/api/uploads/avatar/${user._id}`)
      .set("Cookie", authCookie(user))
      .attach("avatar", Buffer.from("<svg onload='alert(1)'/>"), { filename: "x.svg", contentType: "image/svg+xml" });

    expect(response.statusCode).toBe(400);
    expect(response.body.error).toBe("server.upload.errors.invalid_file_type");
  });

  it("should return an error if the file is too large", async () => {
    const user = await User.create(adminUser);

    const response = await request(app)
      .post(`/api/uploads/avatar/${user._id}`)
      .set("Cookie", authCookie(user))
      .attach("avatar", Buffer.alloc(Constants.AVATAR_MAX_SIZE + 1), png);

    expect(response.statusCode).toBe(400);
    expect(response.body.error).toBe("server.upload.errors.limit");
  });

  it("should delete the old avatar and save the new one", async () => {
    const user = await User.create(userAdminWithAvatar);

    const response = await request(app)
      .post(`/api/uploads/avatar/${user._id}`)
      .set("Cookie", authCookie(user))
      .attach("avatar", Buffer.from("fake png"), png);

    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe("server.upload.messages.avatar_success");
    expect(bucket.file).toHaveBeenCalledWith("avatars/_test_hello-world.png");
    expect(response.body.user.avatar).toMatch(/^https:\/\/storage\.googleapis\.com\/test-bucket\/avatars\/.+\.png$/);
    expect(response.body.user.password).toBe(undefined);
  });

  it("should not let a user change another user's avatar (IDOR)", async () => {
    const attacker = await User.create(regularUser);
    const victim = await User.create(userAdminWithAvatar);

    const response = await request(app)
      .post(`/api/uploads/avatar/${victim._id}`)
      .set("Cookie", authCookie(attacker))
      .attach("avatar", Buffer.from("fake png"), png);

    expect(response.statusCode).toBe(403);
    expect((await User.findById(victim._id)).avatar).toBe(userAdminWithAvatar.avatar);
  });

  it("should return a generic 500 error if there is a server problem", async () => {
    const user = await User.create(userAdminWithAvatar);
    const cookie = authCookie(user);

    // First findById is the auth middleware, the second one is the controller
    const original = User.findById.bind(User);
    vi.spyOn(User, "findById")
      .mockImplementationOnce(original)
      .mockImplementationOnce(() => {
        throw new Error("Test error");
      });

    const response = await request(app)
      .post(`/api/uploads/avatar/${user._id}`)
      .set("Cookie", cookie)
      .attach("avatar", Buffer.from("fake png"), png);

    expect(response.body.error).toBe("server.global.errors.internal");
    expect(response.statusCode).toBe(500);
  });
});
