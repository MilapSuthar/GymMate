import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/auth";
import { blockedUserIds } from "@/lib/block";

/**
 * GET /api/meetups — upcoming meetups for the Community feed.
 *
 * Filters out:
 *   - meetups not in "open" status (cancelled, completed)
 *   - meetups whose scheduledAt is already in the past
 *   - meetups hosted by someone in a block relationship with the viewer
 *
 * Sorted by scheduledAt ascending — soonest first, so the feed always opens
 * on the most actionable thing. Capped at 50 per call; pagination lands in a
 * later milestone when we have enough Meetups for it to matter.
 *
 * Returns each Meetup with the host's basic info and an attendance summary
 * (rsvpCount, isMine = host is the viewer, hasRsvped = viewer is going).
 */
export const GET = withAuth(async (_req, payload) => {
  const me = payload.sub;
  const blocked = await blockedUserIds(me);

  const meetups = await prisma.meetup.findMany({
    where: {
      status: "open",
      scheduledAt: { gte: new Date() },
    },
    orderBy: { scheduledAt: "asc" },
    include: {
      host: {
        select: { id: true, name: true, displayName: true, photoUrl: true },
      },
      rsvps: {
        where: { status: "going" },
        select: { userId: true },
      },
    },
    take: 50,
  });

  const filtered = meetups
    .filter((m) => !blocked.has(m.hostId))
    .map((m) => {
      const rsvpUserIds = new Set(m.rsvps.map((r) => r.userId));
      return {
        id: m.id,
        title: m.title,
        description: m.description,
        sportTag: m.sportTag,
        location: m.location,
        latitude: m.latitude,
        longitude: m.longitude,
        scheduledAt: m.scheduledAt,
        durationMins: m.durationMins,
        capacity: m.capacity,
        rsvpCount: m.rsvps.length,
        isMine: m.hostId === me,
        hasRsvped: rsvpUserIds.has(me),
        host: {
          id: m.host.id,
          name: m.host.displayName || m.host.name,
          photoUrl: m.host.photoUrl,
        },
      };
    });

  return NextResponse.json({ meetups: filtered });
});
