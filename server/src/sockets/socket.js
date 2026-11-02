import { Server as SocketIOServer } from "socket.io";
import { corsOptions } from "../configuration/corsOptions.js";
import { ACCESS_TOKEN_COOKIE, readCookie } from "../utils/authCookie.js";
import { authenticateToken } from "../middlewares/verifyToken.js";
import { userRoles } from "../utils/enums/userRoles.js";

const ADMINS_ROOM = "admins";

let io;
// userId -> Set of socket ids, so a user with several tabs stays online until the last one closes
const userSocketMap = new Map();

const emitOnlineUsers = () => {
  io.to(ADMINS_ROOM).emit("getOnlineUsers", [...userSocketMap.keys()]);
};

/**
 * @function initSockets
 * @description Initializes the Socket.IO server. Connections are authenticated with the same httpOnly cookie
 * as the REST API; the list of online users is only broadcast to admins.
 * @param {http.Server} httpServer - The HTTP server to integrate with the Socket.IO server.
 * @returns {SocketIOServer} The initialized Socket.IO server instance.
 */
export function initSockets(httpServer) {
  io = new SocketIOServer(httpServer, {
    cors: corsOptions,
  });

  io.use(async (socket, next) => {
    try {
      const token = readCookie(socket.handshake.headers.cookie, ACCESS_TOKEN_COOKIE);
      const user = token ? await authenticateToken(token) : null;
      if (!user) return next(new Error("Not Authenticated"));

      socket.data.userId = user._id.toString();
      socket.data.role = user.role;
      next();
    } catch {
      next(new Error("Not Authenticated"));
    }
  });

  io.on("connection", (socket) => {
    const { userId, role } = socket.data;

    if (role === userRoles.ADMIN) socket.join(ADMINS_ROOM);

    if (!userSocketMap.has(userId)) userSocketMap.set(userId, new Set());
    userSocketMap.get(userId).add(socket.id);
    emitOnlineUsers();

    // Handle user disconnection
    socket.on("disconnect", () => {
      const sockets = userSocketMap.get(userId);
      sockets?.delete(socket.id);
      if (sockets?.size === 0) userSocketMap.delete(userId);
      emitOnlineUsers();
    });
  });

  return io; // Return the Socket.IO server instance
}
