import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuthContext } from "./authContext";
import io, { Socket } from "socket.io-client";

interface SocketContextType {
  socket: Socket | null;
  onlineUsers: string[];
  isOnline: boolean;
}

const socketContext = createContext<SocketContextType | undefined>(undefined);

export const useSocketContext = (): SocketContextType => {
  const context = useContext(socketContext);
  if (!context) {
    throw new Error("useSocketContext must be used within a SocketContextProvider");
  }
  return context;
};

interface SocketContextProviderProps {
  children: React.ReactNode;
}

export const SocketContextProvider: React.FC<SocketContextProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const { authUser } = useAuthContext();
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    if (authUser?._id) {
      // Authenticated by the httpOnly auth cookie
      const newSocket = io(import.meta.env.VITE_API_URL, {
        withCredentials: true,
      });

      setSocket(newSocket);

      newSocket.on("connect", () => setIsOnline(true));
      newSocket.on("disconnect", () => setIsOnline(false));

      // Only sent to admins
      newSocket.on("getOnlineUsers", (users: string[]) => {
        setOnlineUsers(users);
      });

      return () => {
        newSocket.disconnect();
      };
    }
  }, [authUser?._id]);

  return <socketContext.Provider value={{ socket, onlineUsers, isOnline }}>{children}</socketContext.Provider>;
};
