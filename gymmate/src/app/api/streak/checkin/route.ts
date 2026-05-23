import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { touchStreak } from "@/lib/streak";

/**
 * POST /api/streak/checkin — record today's activity and return the streak.
 *
 * Called once per app load by the top bar. Idempotent within a UTC day, so
 * repeated calls on the same day are harmless.
 */
export const POST = withAuth(async (_req, payload) => {
  const { streakCount } = await touchStreak(payload.sub);
  return NextResponse.json({ streakCount });
});
