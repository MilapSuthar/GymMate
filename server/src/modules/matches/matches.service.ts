import { prisma } from "../../config/db";
import { NotFoundError, ForbiddenError } from "../../lib/errors";

export async function getMatches(userId: string) {
  const matches = await prisma.match.findMany({
    where: {
      isActive: true,
      OR: [{ userAId: userId }, { userBId: userId }],
    },
    include: {
      userA: { select: { id: true, displayName: true, avatarUrl: true } },
      userB: { select: { id: true, displayName: true, avatarUrl: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { content: true, messageType: true, createdAt: true, senderId: true },
      },
    },
    orderBy: { matchedAt: "desc" },
  });

  return matches.map((m) => ({
    id: m.id,
    matchedAt: m.matchedAt,
    otherUser: m.userAId === userId ? m.userB : m.userA,
    lastMessage: m.messages[0] ?? null,
  }));
}

export async function getMatch(userId: string, matchId: string) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      userA: { select: { id: true, displayName: true, avatarUrl: true, photos: true, gymName: true } },
      userB: { select: { id: true, displayName: true, avatarUrl: true, photos: true, gymName: true } },
    },
  });
  if (!match) throw new NotFoundError("Match not found");
  if (match.userAId !== userId && match.userBId !== userId) throw new ForbiddenError();

  return {
    id: match.id,
    matchedAt: match.matchedAt,
    otherUser: match.userAId === userId ? match.userB : match.userA,
  };
}
