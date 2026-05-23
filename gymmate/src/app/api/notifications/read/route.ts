import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/auth";
import { parseJson } from "@/lib/validation";

const readSchema = z.object({
  ids: z.array(z.string()).optional(),
  all: z.boolean().optional(),
  // Mark every notification tied to a given match read — used when the user
  // opens a conversation, regardless of how they navigated to it.
  matchId: z.string().optional(),
});

export const POST = withAuth(async (req, payload) => {
  const parsed = await parseJson(req, readSchema);
  if (parsed.error) return parsed.error;
  const { ids, all, matchId } = parsed.data;

  if (all) {
    await prisma.notification.updateMany({
      where: { userId: payload.sub, read: false },
      data: { read: true },
    });
  } else if (matchId) {
    // new_match / new_message notifications store their matchId inside the
    // `data` JSON blob. SQLite has no JSON query support via Prisma, so we
    // substring-match the blob — a cuid is unique enough that a stray match
    // is effectively impossible.
    await prisma.notification.updateMany({
      where: {
        userId: payload.sub,
        read: false,
        data: { contains: matchId },
      },
      data: { read: true },
    });
  } else if (ids && ids.length > 0) {
    await prisma.notification.updateMany({
      where: { userId: payload.sub, id: { in: ids } },
      data: { read: true },
    });
  } else {
    return NextResponse.json(
      { error: "Provide ids[], matchId, or all:true" },
      { status: 400 }
    );
  }

  const unreadCount = await prisma.notification.count({
    where: { userId: payload.sub, read: false },
  });

  return NextResponse.json({ ok: true, unreadCount });
});
