import { Server, Socket } from "socket.io";
import { prisma } from "../config/db";
import { sendPushNotification } from "../modules/notifications/notifications.service";
import { logger } from "../lib/logger";

export function registerChatGateway(io: Server) {
  io.on("connection", (socket: Socket) => {
    const userId = socket.data.user?.sub as string;
    logger.debug({ userId }, "Socket connected");

    socket.on("join_chat", async ({ match_id }: { match_id: string }) => {
      try {
        const match = await prisma.match.findUnique({ where: { id: match_id } });
        if (!match || (match.userAId !== userId && match.userBId !== userId)) return;
        socket.join(`match:${match_id}`);
      } catch (err) {
        logger.error(err, "join_chat error");
      }
    });

    socket.on("send_message", async ({ match_id, content, message_type }: { match_id: string; content: string; message_type: string }) => {
      try {
        const match = await prisma.match.findUnique({ where: { id: match_id } });
        if (!match || (match.userAId !== userId && match.userBId !== userId)) return;

        const message = await prisma.message.create({
          data: { matchId: match_id, senderId: userId, content, messageType: (message_type as "text" | "image" | "gif") ?? "text" },
          select: { id: true, matchId: true, senderId: true, content: true, messageType: true, createdAt: true },
        });

        io.to(`match:${match_id}`).emit("new_message", { message });

        // Notify the other user if they're not in the room
        const otherUserId = match.userAId === userId ? match.userBId : match.userAId;
        const roomSockets = await io.in(`match:${match_id}`).fetchSockets();
        const otherOnline = roomSockets.some((s) => s.data.user?.sub === otherUserId);

        if (!otherOnline) {
          const sender = await prisma.user.findUnique({ where: { id: userId }, select: { displayName: true } });
          await sendPushNotification(otherUserId, sender?.displayName ?? "GymMate", content ?? "📷 Photo", { matchId: match_id });
        }
      } catch (err) {
        logger.error(err, "send_message error");
      }
    });

    socket.on("typing_start", ({ match_id }: { match_id: string }) => {
      socket.to(`match:${match_id}`).emit("user_typing", { match_id, user_id: userId });
    });

    socket.on("typing_stop", ({ match_id }: { match_id: string }) => {
      socket.to(`match:${match_id}`).emit("user_stopped_typing", { match_id, user_id: userId });
    });

    socket.on("mark_read", async ({ match_id, message_id }: { match_id: string; message_id: string }) => {
      try {
        const readAt = new Date();
        await prisma.message.updateMany({
          where: { id: message_id, matchId: match_id, senderId: { not: userId } },
          data: { readAt },
        });
        socket.to(`match:${match_id}`).emit("message_read", { match_id, message_id, read_at: readAt });
      } catch (err) {
        logger.error(err, "mark_read error");
      }
    });

    socket.on("disconnect", () => {
      prisma.user.update({ where: { id: userId }, data: { lastSeenAt: new Date() } }).catch(() => null);
      logger.debug({ userId }, "Socket disconnected");
    });
  });
}
