import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/auth";

export const POST = withAuth<{ params: Promise<{ questionId: string }> }>(
  async (_req, payload, ctx) => {
    const { questionId } = await ctx.params;

    const question = await prisma.question.findUnique({
      where: { id: questionId },
      select: { id: true },
    });
    if (!question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    const existing = await prisma.questionLike.findUnique({
      where: { questionId_userId: { questionId, userId: payload.sub } },
    });

    if (existing) {
      await prisma.questionLike.delete({
        where: { questionId_userId: { questionId, userId: payload.sub } },
      });
    } else {
      await prisma.questionLike.create({
        data: { questionId, userId: payload.sub },
      });
    }

    const likeCount = await prisma.questionLike.count({ where: { questionId } });
    return NextResponse.json({ liked: !existing, likeCount });
  }
);
