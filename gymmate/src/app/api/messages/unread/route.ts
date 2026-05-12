import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/auth";

/**
 * GET /api/messages/unread — total unread messages addressed to the user
 * across all matches. Drives the bottom-nav badge.
 *
 * Definition of "unread": message belongs to a match the user is in, was
 * NOT sent by the user, and has not yet been marked read.
 */
export const GET = withAuth(async (_req, payload) => {
  const me = payload.sub;
  const count = await prisma.message.count({
    where: {
      readAt: null,
      senderId: { not: me },
      match: { OR: [{ userAId: me }, { userBId: me }] },
    },
  });
  return NextResponse.json({ unread: count });
});
