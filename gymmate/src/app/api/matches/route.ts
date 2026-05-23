import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/auth";
import { blockedUserIds } from "@/lib/block";

/**
 * GET /api/matches — all matches for the current user, with the other user's
 * basic info and a one-message preview of the latest message in the thread.
 *
 * Sorted by most recent activity: lastMessage timestamp if a thread exists,
 * otherwise the match creation date.
 */
export const GET = withAuth(async (_req, payload) => {
  const me = payload.sub;

  // Matches with a blocked user are hidden from the list entirely — the
  // Match row stays in the DB (unblocking restores the thread) but it
  // shouldn't surface while the block is active.
  const blocked = await blockedUserIds(me);

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

  const enriched = matches
    .filter((m) => {
      const otherId = m.userAId === me ? m.userBId : m.userAId;
      return !blocked.has(otherId);
    })
    .map((m) => {
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
      lastActivityAt: last ? last.createdAt : m.createdAt,
    };
  });

  enriched.sort(
    (a, b) =>
      new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime()
  );

  return NextResponse.json({ matches: enriched });
});
