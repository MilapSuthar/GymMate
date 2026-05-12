import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/auth";

/**
 * GET /api/matches — all matches for the current user, with the other user's
 * basic info, a one-message preview of the latest message, and how many
 * unread messages the user has in that thread.
 *
 * Sorted by most recent activity: lastMessage timestamp if a thread exists,
 * otherwise the match creation date.
 */
export const GET = withAuth(async (_req, payload) => {
  const me = payload.sub;

  const matches = await prisma.match.findMany({
    where: { OR: [{ userAId: me }, { userBId: me }] },
    include: {
      userA: {
        select: { id: true, name: true, displayName: true, photoUrl: true },
      },
      userB: {
        select: { id: true, name: true, displayName: true, photoUrl: true },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, content: true, senderId: true, createdAt: true },
      },
    },
  });

  // Per-match unread counts in one query — avoids N+1 loops
  const unreadGrouped = await prisma.message.groupBy({
    by: ["matchId"],
    where: {
      readAt: null,
      senderId: { not: me },
      matchId: { in: matches.map((m) => m.id) },
    },
    _count: { _all: true },
  });
  const unreadByMatch = new Map(
    unreadGrouped.map((row) => [row.matchId, row._count._all])
  );

  const enriched = matches.map((m) => {
    const other = m.userAId === me ? m.userB : m.userA;
    const last = m.messages[0] ?? null;
    return {
      id: m.id,
      createdAt: m.createdAt,
      otherUser: {
        id: other.id,
        name: other.displayName || other.name,
        photoUrl: other.photoUrl,
      },
      lastMessage: last
        ? {
            id: last.id,
            content: last.content,
            // "you: ..." vs "them: ..." — frontend uses this to style the preview
            fromMe: last.senderId === me,
            createdAt: last.createdAt,
          }
        : null,
      unreadCount: unreadByMatch.get(m.id) ?? 0,
      lastActivityAt: last ? last.createdAt : m.createdAt,
    };
  });

  enriched.sort(
    (a, b) =>
      new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime()
  );

  return NextResponse.json({ matches: enriched });
});
