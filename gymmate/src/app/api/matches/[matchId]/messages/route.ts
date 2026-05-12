import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/auth";
import { parseJson } from "@/lib/validation";
import { sendNotification } from "@/lib/notifications";

const messageSchema = z.object({
  content: z.string().trim().min(1).max(1000),
});

export const GET = withAuth<{ params: Promise<{ matchId: string }> }>(
  async (_req, payload, ctx) => {
    const { matchId } = await ctx.params;

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: { id: true, userAId: true, userBId: true },
    });
    if (!match || (match.userAId !== payload.sub && match.userBId !== payload.sub)) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    const messages = await prisma.message.findMany({
      where: { matchId },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ messages });
  }
);

export const POST = withAuth<{ params: Promise<{ matchId: string }> }>(
  async (req, payload, ctx) => {
    const { matchId } = await ctx.params;

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        userA: { select: { id: true, name: true, displayName: true } },
        userB: { select: { id: true, name: true, displayName: true } },
      },
    });
    if (!match || (match.userAId !== payload.sub && match.userBId !== payload.sub)) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    const parsed = await parseJson(req, messageSchema);
    if (parsed.error) return parsed.error;
    const { content } = parsed.data;

    const message = await prisma.message.create({
      data: {
        matchId,
        senderId: payload.sub,
        content,
      },
    });

    // Notify the recipient (best-effort; never throws)
    const sender = match.userA.id === payload.sub ? match.userA : match.userB;
    const recipient = match.userA.id === payload.sub ? match.userB : match.userA;
    const senderName = sender.displayName || sender.name;

    await sendNotification({
      userId: recipient.id,
      type: "new_message",
      title: `New message from ${senderName}`,
      body: content.length > 80 ? content.slice(0, 77) + "…" : content,
      data: { matchId, messageId: message.id, senderId: payload.sub },
    });

    return NextResponse.json({ message }, { status: 201 });
  }
);
