import { io, Socket } from "socket.io-client";
import { getAccessToken } from "./secureStorage";

let socket: Socket | null = null;

export async function getSocket(apiUrl: string): Promise<Socket> {
  if (socket?.connected) return socket;

  const token = await getAccessToken();
  socket = io(apiUrl, {
    auth: { token },
    transports: ["websocket"],
    autoConnect: false,
  });

  socket.connect();
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
