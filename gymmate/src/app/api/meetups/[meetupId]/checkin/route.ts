import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/auth";

/**
 * POST /api/meetups/[meetupId]/checkin — mark the viewer as having shown up.
 *
 * The "I was actually there" tick. Only meaningful AFTER scheduledAt — checking
 * in before the session would defeat the purpose. The viewer must already
 * have a "going" RSVP for the meetup (hosts get one auto-created when they
 * post the meetup, so they qualify).
 *
 * Idempotent: re-posting after a successful check-in is a no-op.
 */
export const POST = withAuth<{ params: Promise<{ meetupId: string }> }>(
  async (_req, payload, ctx) => {
    const { meetupId } = await ctx.params;
    const me = payload.sub;

    const meetup = await prisma.meetup.findUnique({
      where: { id: meetupId },
      select: { id: true, scheduledAt: true, status: true, hostId: true },
    });
    if (!meetup) {
      return NextResponse.json({ error: "Meetup not found" }, { status: 404 });
    }
    if (meetup.status === "cancelled") {
      return NextResponse.json(
        { error: "Meetup was cancelled" },
        { status: 409 }
      );
    }
    if (meetup.scheduledAt.getTime() > Date.now()) {
      return NextResponse.json(
        { error: "Meetup hasn't started yet" },
        { status: 409 }
      );
    }

    // The viewer must have a "going" RSVP (host or attendee — same row shape).
    const rsvp = await prisma.meetupRsvp.findUnique({
      where: { meetupId_userId: { meetupId, userId: me } },
    });
    if (!rsvp || rsvp.status !== "going") {
      return NextResponse.json(
        { error: "You didn't RSVP to this meetup" },
        { status: 403 }
      );
    }

    if (rsvp.checkedIn) {
      // Already checked in — keep the call idempotent.
      return NextResponse.json({ checkedIn: true });
    }

    await prisma.meetupRsvp.update({
      where: { id: rsvp.id },
      data: { checkedIn: true },
    });

    return NextResponse.json({ checkedIn: true });
  },
  { rateLimit: { name: "meetup-checkin", limit: 30, windowSeconds: 60 } }
);
