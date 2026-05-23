import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/auth";

/**
 * POST /api/users/[userId]/block — block a user (idempotent).
 * DELETE /api/users/[userId]/block — unblock a user.
 *
 * Blocks are one-directional from the blocker's perspective, but the discover
 * pipeline excludes users on either side of a block — so a block effectively
 * hides both users from each other. This is the safer default.
 */

export const POST = withAuth<{ params: Promise<{ userId: string }> }>(
  async (_req, payload, ctx) => {
    const { userId: blockedId } = await ctx.params;
    const blockerId = payload.sub;

    if (blockerId === blockedId) {
      return NextResponse.json(
        { error: "You cannot block yourself" },
        { status: 400 }
      );
    }

    const blocked = await prisma.user.findUnique({
      where: { id: blockedId },
      select: { id: true },
    });
    if (!blocked) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    await prisma.block.upsert({
      where: { blockerId_blockedId: { blockerId, blockedId } },
      create: { blockerId, blockedId },
      update: {},
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  }
);

export const DELETE = withAuth<{ params: Promise<{ userId: string }> }>(
  async (_req, payload, ctx) => {
    const { userId: blockedId } = await ctx.params;
    const blockerId = payload.sub;

    await prisma.block
      .delete({
        where: { blockerId_blockedId: { blockerId, blockedId } },
      })
      .catch(() => {
        // Not blocked — idempotent unblock should not 404.
      });

    return NextResponse.json({ ok: true });
  }
);
