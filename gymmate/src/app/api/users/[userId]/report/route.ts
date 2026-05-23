import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/auth";
import { parseJson } from "@/lib/validation";

const reportSchema = z.object({
  reason: z.string().trim().min(1).max(500),
  // Optional context (matchId, questionId, messageId) — stored as JSON string
  context: z.record(z.string(), z.unknown()).optional(),
});

/**
 * POST /api/users/[userId]/report
 *
 * Submitting a report ALSO creates a Block, so the reporter immediately stops
 * seeing the reported user in discover and existing matches. This is the
 * pattern Tinder/Hinge use — users overwhelmingly expect reporting to also
 * block, and asking them to do both is friction at exactly the moment they
 * least want it.
 *
 * Reports are idempotent on (reporter, reported) within an open report; we
 * still record duplicate reports because moderators want signal density.
 */
export const POST = withAuth<{ params: Promise<{ userId: string }> }>(
  async (req, payload, ctx) => {
    const { userId: reportedId } = await ctx.params;
    const reporterId = payload.sub;

    if (reportedId === reporterId) {
      return NextResponse.json(
        { error: "You cannot report yourself" },
        { status: 400 }
      );
    }

    const reported = await prisma.user.findUnique({
      where: { id: reportedId },
      select: { id: true },
    });
    if (!reported) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const parsed = await parseJson(req, reportSchema);
    if (parsed.error) return parsed.error;
    const { reason, context } = parsed.data;

    // Create the report and the matching block in a single transaction. The
    // block is an upsert so a duplicate report (user reports the same person
    // twice) doesn't fail the whole request.
    const [report] = await prisma.$transaction([
      prisma.report.create({
        data: {
          reporterId,
          reportedId,
          reason,
          context: context ? JSON.stringify(context) : null,
        },
      }),
      prisma.block.upsert({
        where: { blockerId_blockedId: { blockerId: reporterId, blockedId: reportedId } },
        create: { blockerId: reporterId, blockedId: reportedId },
        update: {}, // already blocked — no-op
      }),
    ]);

    return NextResponse.json({ reportId: report.id }, { status: 201 });
  },
  { rateLimit: { name: "report", limit: 10, windowSeconds: 300 } }
);
