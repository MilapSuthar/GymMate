import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/auth";

export const POST = withAuth<{ params: Promise<{ answerId: string }> }>(
  async (_req, payload, ctx) => {
    const { answerId } = await ctx.params;

    const answer = await prisma.answer.findUnique({
      where: { id: answerId },
      select: { id: true },
    });
    if (!answer) {
      return NextResponse.json({ error: "Answer not found" }, { status: 404 });
    }

    const existing = await prisma.answerLike.findUnique({
      where: { answerId_userId: { answerId, userId: payload.sub } },
    });

    if (existing) {
      await prisma.answerLike.delete({
        where: { answerId_userId: { answerId, userId: payload.sub } },
      });
    } else {
      await prisma.answerLike.create({
        data: { answerId, userId: payload.sub },
      });
    }

    const likeCount = await prisma.answerLike.count({ where: { answerId } });
    return NextResponse.json({ liked: !existing, likeCount });
  }
);
