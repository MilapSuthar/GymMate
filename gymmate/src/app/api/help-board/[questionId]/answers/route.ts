import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/auth";
import { parseJson } from "@/lib/validation";
import { sendNotification } from "@/lib/notifications";

const answerSchema = z.object({
  content: z.string().min(1).max(5000),
});

export const POST = withAuth<{ params: Promise<{ questionId: string }> }>(
  async (req, payload, ctx) => {
    const { questionId } = await ctx.params;
    const parsed = await parseJson(req, answerSchema);
    if (parsed.error) return parsed.error;

    const question = await prisma.question.findUnique({
      where: { id: questionId },
      select: {
        id: true,
        authorId: true,
        title: true,
      },
    });
    if (!question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    const answer = await prisma.answer.create({
      data: {
        questionId,
        authorId: payload.sub,
        body: parsed.data.content.trim(),
      },
      include: {
        author: { select: { id: true, name: true, displayName: true, photoUrl: true } },
        _count: { select: { likes: true } },
      },
    });

    // Notify the question author (skip self-answers)
    if (question.authorId !== payload.sub) {
      const answererName = answer.author.displayName || answer.author.name;
      await sendNotification({
        userId: question.authorId,
        type: "new_answer",
        title: `${answererName} answered your question`,
        body: question.title,
        data: { questionId, answerId: answer.id },
      });
    }

    return NextResponse.json(
      {
        answer: {
          id: answer.id,
          body: answer.body,
          likeCount: answer._count.likes,
          likedByMe: false,
          author: {
            id: answer.author.id,
            name: answer.author.displayName || answer.author.name,
            photoUrl: answer.author.photoUrl,
          },
          createdAt: answer.createdAt,
        },
      },
      { status: 201 }
    );
  }
);
