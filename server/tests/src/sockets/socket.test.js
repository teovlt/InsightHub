import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createServer } from "http";
import { io as clientIO } from "socket.io-client";
import { app } from "../../../src/app";
import { initSockets } from "../../../src/sockets/socket";
import { User } from "../../../src/models/userModel";
import { adminUser, regularUser } from "../../fixtures/users";
import { authCookie } from "../../helpers";

describe("Socket Server", () => {
  let httpServer;
  let io;
  let clientSockets = [];
  const PORT = 4000;

  const connect = (cookie) => {
    const socket = clientIO(`http://localhost:${PORT}`, {
      transports: ["websocket"], // Force WebSocket
      extraHeaders: cookie ? { Cookie: cookie } : {},
      reconnection: false,
    });
    clientSockets.push(socket);
    return socket;
  };

  const waitFor = (socket, event) => new Promise((resolve) => socket.once(event, resolve));

  beforeEach(async () => {
    httpServer = createServer(app);
    io = initSockets(httpServer);

    await new Promise((resolve) => httpServer.listen(PORT, resolve));
  });

  afterEach(async () => {
    clientSockets.forEach((socket) => socket.disconnect());
    clientSockets = [];
    io.close();
    await new Promise((resolve) => httpServer.close(resolve));
  });

  it("should refuse connections without a valid auth cookie", async () => {
    const socket = connect();
    const error = await waitFor(socket, "connect_error");

    expect(error.message).toBe("Not Authenticated");
  });

  it("should not trust a userId sent in the query anymore", async () => {
    const user = await User.create(regularUser);
    const socket = clientIO(`http://localhost:${PORT}`, {
      transports: ["websocket"],
      query: { userId: user._id.toString() },
      reconnection: false,
    });
    clientSockets.push(socket);

    const error = await waitFor(socket, "connect_error");
    expect(error.message).toBe("Not Authenticated");
  });

  it("should accept an authenticated user and only send the online list to admins", async () => {
    const admin = await User.create(adminUser);
    const user = await User.create(regularUser);

    const adminSocket = connect(authCookie(admin));
    const firstList = await waitFor(adminSocket, "getOnlineUsers");
    expect(firstList).toEqual([admin._id.toString()]);

    let userReceivedList = false;
    const userSocket = connect(authCookie(user));
    userSocket.on("getOnlineUsers", () => {
      userReceivedList = true;
    });

    const secondList = await waitFor(adminSocket, "getOnlineUsers");
    expect(userSocket.connected).toBe(true);
    expect(secondList.sort()).toEqual([admin._id.toString(), user._id.toString()].sort());
    expect(userReceivedList).toBe(false);
  });
});
