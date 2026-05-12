import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/auth";

export const GET = withAuth<{ params: Promise<{ questionId: string }> }>(
  async (_req, payload, ctx) => {
    const { questionId } = await ctx.params;

    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: {
        author: { select: { id: true, name: true, displayName: true, photoUrl: true } },
        likes: { where: { userId: payload.sub }, select: { id: true } },
        _count: { select: { likes: true } },
        answers: {
          orderBy: { createdAt: "asc" },
          include: {
            author: { select: { id: true, name: true, displayName: true, photoUrl: true } },
            likes: { where: { userId: payload.sub }, select: { id: true } },
            _count: { select: { likes: true } },
          },
        },
      },
    });

    if (!question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    return NextResponse.json({
      question: {
        id: question.id,
        title: question.title,
        body: question.body,
        tags: question.tags ? question.tags.split(",").filter(Boolean) : [],
        likeCount: question._count.likes,
        likedByMe: question.likes.length > 0,
        author: {
          id: question.author.id,
          name: question.author.displayName || question.author.name,
          photoUrl: question.author.photoUrl,
        },
        createdAt: question.createdAt,
        answers: question.answers.map((a) => ({
          id: a.id,
          body: a.body,
          likeCount: a._count.likes,
          likedByMe: a.likes.length > 0,
          author: {
            id: a.author.id,
            name: a.author.displayName || a.author.name,
            photoUrl: a.author.photoUrl,
          },
          createdAt: a.createdAt,
        })),
      },
    });
  }
);
