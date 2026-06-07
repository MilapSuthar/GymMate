import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/auth";
import { parseJson } from "@/lib/validation";

const rsvpSchema = z.object({
  going: z.boolean(),
});

/**
 * POST /api/meetups/[meetupId]/rsvp — toggle the viewer's RSVP.
 *
 * Body: { going: boolean }
 *   true  → status = "going"
 *   false → status = "cancelled"
 *
 * Refuses if:
 *   - the meetup doesn't exist (404)
 *   - the meetup is no longer "open" or already in the past (409)
 *   - the viewer is the host (400 — hosts always count as going)
 *   - going=true but the meetup is at capacity (409)
 *
 * Idempotent: the RSVP row is upserted on the unique (meetupId, userId) key,
 * so a user can RSVP, cancel, RSVP again as many times as they like without
 * creating duplicates.
 */
export const POST = withAuth<{ params: Promise<{ meetupId: string }> }>(
  async (req, payload, ctx) => {
    const { meetupId } = await ctx.params;
    const me = payload.sub;

    const parsed = await parseJson(req, rsvpSchema);
    if (parsed.error) return parsed.error;
    const { going } = parsed.data;

    const meetup = await prisma.meetup.findUnique({
      where: { id: meetupId },
    });
    if (!meetup) {
      return NextResponse.json({ error: "Meetup not found" }, { status: 404 });
    }
    if (meetup.status !== "open") {
      return NextResponse.json(
        { error: "This meetup is no longer open" },
        { status: 409 }
      );
    }
    if (meetup.scheduledAt.getTime() <= Date.now()) {
      return NextResponse.json(
        { error: "This meetup has already started" },
        { status: 409 }
      );
    }
    if (meetup.hostId === me) {
      return NextResponse.json(
        { error: "You're the host — you're already going" },
        { status: 400 }
      );
    }

    // Capacity gate. Only matters when the viewer is joining, not when they're
    // dropping out. We count by querying so we don't depend on Prisma's
    // filtered _count syntax (which has bitten us on older clients).
    if (going && meetup.capacity != null) {
      const goingCount = await prisma.meetupRsvp.count({
        where: { meetupId, status: "going" },
      });
      // An existing "going" row for the viewer would already be in goingCount,
      // so a no-op re-confirm doesn't trip the cap.
      const viewerAlreadyGoing = await prisma.meetupRsvp.findUnique({
        where: { meetupId_userId: { meetupId, userId: me } },
        select: { status: true },
      });
      const effectiveCount =
        viewerAlreadyGoing?.status === "going" ? goingCount : goingCount + 1;
      if (effectiveCount > meetup.capacity) {
        return NextResponse.json(
          { error: "This meetup is full" },
          { status: 409 }
        );
      }
    }

    const status = going ? "going" : "cancelled";
    const rsvp = await prisma.meetupRsvp.upsert({
      where: { meetupId_userId: { meetupId, userId: me } },
      create: { meetupId, userId: me, status },
      update: { status },
    });

    return NextResponse.json({
      rsvp: { id: rsvp.id, status: rsvp.status },
    });
  },
  { rateLimit: { name: "meetup-rsvp", limit: 30, windowSeconds: 60 } }
);
