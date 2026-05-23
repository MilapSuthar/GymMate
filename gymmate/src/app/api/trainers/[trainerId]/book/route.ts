import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/auth";
import { parseJson } from "@/lib/validation";

const bookSchema = z.object({
  scheduledAt: z.string().min(1),
  durationMins: z.number().int().min(30).max(180).optional(),
  notes: z.string().max(500).optional(),
});

/** Longest session we allow — bounds the overlap-check query window. */
const MAX_DURATION_MINS = 180;
/** Used when a booking row has no explicit duration. */
const DEFAULT_DURATION_MINS = 60;

/**
 * POST /api/trainers/[trainerId]/book — request a session with a trainer.
 *
 * Rejects three classes of invalid booking before any row is written:
 *   1. an unparseable date, or a time that is not in the future,
 *   2. booking yourself (a trainer can't be their own client),
 *   3. a slot that overlaps an existing, non-cancelled booking for the same
 *      trainer — without this the trainer gets silently double-booked.
 */
export const POST = withAuth<{ params: Promise<{ trainerId: string }> }>(
  async (req, payload, ctx) => {
    const { trainerId } = await ctx.params;

    const trainer = await prisma.trainerProfile.findUnique({
      where: { id: trainerId },
    });
    if (!trainer) {
      return NextResponse.json({ error: "Trainer not found" }, { status: 404 });
    }

    // A trainer booking their own profile is always a mistake.
    if (trainer.userId === payload.sub) {
      return NextResponse.json(
        { error: "You cannot book a session with yourself" },
        { status: 400 }
      );
    }

    const parsed = await parseJson(req, bookSchema);
    if (parsed.error) return parsed.error;
    const { scheduledAt, durationMins, notes } = parsed.data;

    const start = new Date(scheduledAt);
    if (Number.isNaN(start.getTime())) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }
    if (start.getTime() <= Date.now()) {
      return NextResponse.json(
        { error: "Cannot book a session in the past" },
        { status: 400 }
      );
    }

    const duration = durationMins ?? DEFAULT_DURATION_MINS;
    const end = new Date(start.getTime() + duration * 60_000);

    // Overlap check. An existing booking can only collide with this one if it
    // starts within [start - MAX_DURATION, end) — any earlier and even a
    // full-length session would have ended before `start`. We fetch that
    // bounded window and test each interval precisely in JS, since SQLite
    // can't do interval math in the WHERE clause.
    const windowStart = new Date(
      start.getTime() - MAX_DURATION_MINS * 60_000
    );
    const nearby = await prisma.booking.findMany({
      where: {
        trainerId,
        status: { not: "cancelled" },
        scheduledAt: { gte: windowStart, lt: end },
      },
      select: { scheduledAt: true, durationMins: true },
    });

    const conflict = nearby.some((b) => {
      const bStart = b.scheduledAt.getTime();
      const bEnd =
        bStart + (b.durationMins ?? DEFAULT_DURATION_MINS) * 60_000;
      // Half-open intervals: [start, end) overlaps [bStart, bEnd).
      return bStart < end.getTime() && start.getTime() < bEnd;
    });
    if (conflict) {
      return NextResponse.json(
        { error: "That time slot is no longer available" },
        { status: 409 }
      );
    }

    const booking = await prisma.booking.create({
      data: {
        clientId: payload.sub,
        trainerId,
        scheduledAt: start,
        durationMins: duration,
        notes: notes ?? null,
        paidAmount: trainer.pricePerSession,
        status: "pending",
        paid: false,
      },
    });

    return NextResponse.json({ booking }, { status: 201 });
  },
  { rateLimit: { name: "booking", limit: 15, windowSeconds: 60 } }
);
