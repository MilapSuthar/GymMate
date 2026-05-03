import { Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { JwtPayload } from "../types";

export function socketAuthMiddleware(socket: Socket, next: (err?: Error) => void) {
  const token = socket.handshake.auth?.token as string | undefined;
  if (!token) return next(new Error("Authentication required"));

  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
    socket.data.user = payload;
    next();
  } catch {
    next(new Error("Invalid or expired token"));
  }
}
