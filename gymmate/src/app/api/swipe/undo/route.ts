import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/auth";

/**
 * POST /api/swipe/undo — rewind the viewer's most recent swipe.
 *
 * Deletes the latest Swipe row the viewer created. If that swipe had formed a
 * Match, the Match is removed too — but only when no messages have been sent
 * yet; once a conversation has started the rewind is refused, so a rewind can
 * never destroy chat history.
 *
 * Returns { undone: { swipeeId, direction } } so the deck can slot the card
 * back to the front.
 */
export const POST = withAuth(
  async (_req, payload) => {
    const me = payload.sub;

    const last = await prisma.swipe.findFirst({
      where: { swiperId: me },
      orderBy: { createdAt: "desc" },
    });
    if (!last) {
      return NextResponse.json({ error: "Nothing to undo" }, { status: 404 });
    }

    // A Match exists only if both people liked each other. Order the pair the
    // same way the swipe route does so we address the same row.
    const [userAId, userBId] = [me, last.swipedId].sort();
    const match = await prisma.match.findUnique({
      where: { userAId_userBId: { userAId, userBId } },
      include: { _count: { select: { messages: true } } },
    });

    if (match && match._count.messages > 0) {
      return NextResponse.json(
        {
          error:
            "You've already started chatting with them — this can't be undone.",
        },
        { status: 409 }
      );
    }

    // Drop the match (if any) and the swipe together so the rewind is atomic.
    await prisma.$transaction([
      ...(match ? [prisma.match.delete({ where: { id: match.id } })] : []),
      prisma.swipe.delete({ where: { id: last.id } }),
    ]);

    return NextResponse.json({
      undone: {
        swipeeId: last.swipedId,
        direction: last.liked ? "like" : "pass",
      },
    });
  },
  { rateLimit: { name: "swipe-undo", limit: 60, windowSeconds: 60 } }
);
