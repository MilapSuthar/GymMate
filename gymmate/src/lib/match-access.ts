import { prisma } from "@/lib/db";

export interface MatchAccess {
  matchId: string;
  userAId: string;
  userBId: string;
  otherUserId: string;
}

/**
 * Returns the match if `userId` is part of it, otherwise null.
 * Used by every chat endpoint to enforce that only match participants
 * can read history, send, stream, or mark as read.
 */
export async function loadMatchForUser(
  matchId: string,
  userId: string
): Promise<MatchAccess | null> {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { id: true, userAId: true, userBId: true },
  });
  if (!match) return null;
  if (match.userAId !== userId && match.userBId !== userId) return null;
  return {
    matchId: match.id,
    userAId: match.userAId,
    userBId: match.userBId,
    otherUserId: match.userAId === userId ? match.userBId : match.userAId,
  };
}
