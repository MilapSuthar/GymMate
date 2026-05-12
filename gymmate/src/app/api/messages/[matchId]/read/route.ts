import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/auth";
import { loadMatchForUser } from "@/lib/match-access";
import { publish } from "@/lib/message-bus";

interface Ctx {
  params: Promise<{ matchId: string }>;
}

/**
 * POST /api/messages/[matchId]/read — mark all messages from the OTHER user
 * as read (sets readAt = now()). Idempotent: re-calling does nothing further.
 *
 * Broadcasts a "read" event so the sender's UI can flip its read receipts.
 */
export const POST = withAuth<Ctx>(async (_req, payload, ctx) => {
  const { matchId } = await ctx.params;
  const access = await loadMatchForUser(matchId, payload.sub);
  if (!access) {
    return NextResponse.json({ error: "Match not found or access denied" }, { status: 403 });
  }

  const result = await prisma.message.updateMany({
    where: {
      matchId,
      // Only mark the OTHER user's messages — your own are always "read by you"
      senderId: { not: payload.sub },
      readAt: null,
    },
    data: { readAt: new Date() },
  });

  if (result.count > 0) {
    publish(matchId, { type: "read", matchId, readerId: payload.sub });
  }

  return NextResponse.json({ updated: result.count });
});
