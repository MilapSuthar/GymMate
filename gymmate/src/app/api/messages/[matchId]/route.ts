import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/auth";
import { parseJson } from "@/lib/validation";
import { loadMatchForUser } from "@/lib/match-access";
import { publish } from "@/lib/message-bus";

const PAGE_SIZE = 20;

interface Ctx {
  params: Promise<{ matchId: string }>;
}

/**
 * GET /api/messages/[matchId] — paginated message history (most recent first).
 *
 * Cursor-based pagination on `createdAt + id`: pass `?before=<messageId>` to
 * load the page older than that message. Returns `nextCursor` (null when
 * there are no older messages).
 */
export const GET = withAuth<Ctx>(async (req, payload, ctx) => {
  const { matchId } = await ctx.params;
  const access = await loadMatchForUser(matchId, payload.sub);
  if (!access) {
    return NextResponse.json({ error: "Match not found or access denied" }, { status: 403 });
  }

  const url = new URL(req.url);
  const before = url.searchParams.get("before") ?? undefined;

  const messages = await prisma.message.findMany({
    where: { matchId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: PAGE_SIZE + 1,
    ...(before && { skip: 1, cursor: { id: before } }),
  });

  const hasMore = messages.length > PAGE_SIZE;
  const page = hasMore ? messages.slice(0, PAGE_SIZE) : messages;

  return NextResponse.json({
    // Ascending order so the client can append directly to the bottom of
    // the chat without reversing on every paginate.
    messages: page.reverse().map((m) => ({
      id: m.id,
      matchId: m.matchId,
      senderId: m.senderId,
      content: m.content,
      createdAt: m.createdAt,
      readAt: m.readAt,
      fromMe: m.senderId === payload.sub,
    })),
    nextCursor: hasMore ? page[0].id : null,
  });
});

const sendSchema = z.object({
  content: z.string().trim().min(1, "Message cannot be empty").max(2000),
});

/**
 * POST /api/messages/[matchId] — save and broadcast a new message.
 * Returns the created row (the sender uses this for the optimistic update;
 * the recipient receives it via SSE).
 */
export const POST = withAuth<Ctx>(async (req, payload, ctx) => {
  const { matchId } = await ctx.params;
  const access = await loadMatchForUser(matchId, payload.sub);
  if (!access) {
    return NextResponse.json({ error: "Match not found or access denied" }, { status: 403 });
  }

  const parsed = await parseJson(req, sendSchema);
  if (parsed.error) return parsed.error;

  const message = await prisma.message.create({
    data: {
      matchId,
      senderId: payload.sub,
      content: parsed.data.content,
    },
  });

  const wire = {
    id: message.id,
    matchId: message.matchId,
    senderId: message.senderId,
    content: message.content,
    createdAt: message.createdAt.toISOString(),
    readAt: message.readAt?.toISOString() ?? null,
  };

  publish(matchId, { type: "message", matchId, message: wire });

  return NextResponse.json({
    message: {
      ...wire,
      fromMe: true,
    },
  }, { status: 201 });
});
