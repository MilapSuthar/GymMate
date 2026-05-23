import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/auth";
import { parseJson } from "@/lib/validation";

const DEFAULT_LIMIT = 20;

export const GET = withAuth(async (req, payload) => {
  const url = new URL(req.url);
  const cursor = url.searchParams.get("cursor") || undefined;

  const rows = await prisma.question.findMany({
    orderBy: { createdAt: "desc" },
    take: DEFAULT_LIMIT + 1,
    ...(cursor && { skip: 1, cursor: { id: cursor } }),
    include: {
      author: { select: { id: true, name: true, displayName: true, photoUrl: true } },
      _count: { select: { likes: true, answers: true } },
      likes: { where: { userId: payload.sub }, select: { id: true } },
    },
  });

  const hasMore = rows.length > DEFAULT_LIMIT;
  const page = hasMore ? rows.slice(0, DEFAULT_LIMIT) : rows;

  return NextResponse.json({
    questions: page.map((q) => ({
      id: q.id,
      title: q.title,
      body: q.body,
      tags: q.tags ? q.tags.split(",").filter(Boolean) : [],
      likeCount: q._count.likes,
      answerCount: q._count.answers,
      likedByMe: q.likes.length > 0,
      author: {
        id: q.author.id,
        name: q.author.displayName || q.author.name,
        photoUrl: q.author.photoUrl,
      },
      createdAt: q.createdAt,
    })),
    nextCursor: hasMore ? page[page.length - 1].id : null,
  });
});

const createSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(5000),
  tags: z.array(z.string().min(1).max(50)).max(5).optional(),
});

export const POST = withAuth(async (req, payload) => {
  const parsed = await parseJson(req, createSchema);
  if (parsed.error) return parsed.error;
  const { title, content, tags } = parsed.data;

  const question = await prisma.question.create({
    data: {
      authorId: payload.sub,
      title: title.trim(),
      body: content.trim(),
      tags: (tags ?? []).join(","),
    },
    include: {
      author: { select: { id: true, name: true, displayName: true, photoUrl: true } },
      _count: { select: { likes: true, answers: true } },
    },
  });

  return NextResponse.json(
    {
      question: {
        id: question.id,
        title: question.title,
        body: question.body,
        tags: question.tags ? question.tags.split(",").filter(Boolean) : [],
        likeCount: question._count.likes,
        answerCount: question._count.answers,
        likedByMe: false,
        author: {
          id: question.author.id,
          name: question.author.displayName || question.author.name,
          photoUrl: question.author.photoUrl,
        },
        createdAt: question.createdAt,
      },
    },
    { status: 201 }
  );
}, {
  rateLimit: { name: "question", limit: 10, windowSeconds: 60 },
});
