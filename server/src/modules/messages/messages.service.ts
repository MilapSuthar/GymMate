import { prisma } from "../../config/db";
import { ForbiddenError, NotFoundError } from "../../lib/errors";

export async function getMessages(userId: string, matchId: string, cursor?: string, limit = 50) {
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) throw new NotFoundError("Match not found");
  if (match.userAId !== userId && match.userBId !== userId) throw new ForbiddenError();

  const messages = await prisma.message.findMany({
    where: { matchId, ...(cursor ? { createdAt: { lt: (await prisma.message.findUnique({ where: { id: cursor } }))?.createdAt } } : {}) },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { id: true, senderId: true, content: true, mediaUrl: true, messageType: true, readAt: true, createdAt: true },
  });

  return messages;
}

export async function sendMessage(userId: string, matchId: string, content?: string, mediaUrl?: string, messageType: "text" | "image" | "gif" = "text") {
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) throw new NotFoundError("Match not found");
  if (match.userAId !== userId && match.userBId !== userId) throw new ForbiddenError();

  return prisma.message.create({
    data: { matchId, senderId: userId, content, mediaUrl, messageType },
    select: { id: true, senderId: true, content: true, mediaUrl: true, messageType: true, createdAt: true },
  });
}
