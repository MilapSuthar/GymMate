import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/auth";

const DAY_MS = 24 * 60 * 60 * 1000;
const RECENT_WINDOW_DAYS = 14;
const WEEK_DAYS = 7;

/**
 * GET /api/meetups/mine — the viewer's meetups, plus the weekly stat.
 *
 * Splits into two buckets:
 *   - upcoming: meetups the viewer is going to (host counts as going) with
 *     scheduledAt in the future. Sorted soonest first.
 *   - recent: same membership, scheduledAt in the last 14 days. Sorted most
 *     recent first. Drives the post-event check-in surface on Profile.
 *
 * Also computes `weeklyStats`:
 *   - weekSessions: count of meetups the viewer has checked into in the last
 *     7 days (the *fitness* sessions count).
 *   - weekCoAttendees: distinct other people checked into those same
 *     meetups — the "you worked out with N people this week" headline number.
 */
export const GET = withAuth(async (_req, payload) => {
  const me = payload.sub;
  const now = Date.now();
  const recentCutoff = new Date(now - RECENT_WINDOW_DAYS * DAY_MS);
  const weekCutoff = new Date(now - WEEK_DAYS * DAY_MS);

  // All my "going" RSVPs in the window we care about (covers both upcoming and
  // recent past in one query — cheaper than two queries, and the same shape
  // for the response mapping below).
  const myRsvps = await prisma.meetupRsvp.findMany({
    where: {
      userId: me,
      status: "going",
      meetup: { scheduledAt: { gte: recentCutoff } },
    },
    include: {
      meetup: {
        include: {
          host: {
            select: {
              id: true,
              name: true,
              displayName: true,
              photoUrl: true,
            },
          },
          rsvps: {
            where: { status: "going" },
            select: { userId: true, checkedIn: true },
          },
        },
      },
    },
  });

  const upcoming: ReturnType<typeof shape>[] = [];
  const recent: ReturnType<typeof shape>[] = [];
  for (const r of myRsvps) {
    const m = r.meetup;
    const shaped = shape(m, me, r.checkedIn);
    if (m.scheduledAt.getTime() > now) {
      upcoming.push(shaped);
    } else {
      recent.push(shaped);
    }
  }

  upcoming.sort(
    (a, b) =>
      new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
  );
  recent.sort(
    (a, b) =>
      new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()
  );

  // Weekly stat: meetups I've actually checked into within the last 7 days,
  // and the distinct *other* people I co-attended with across those.
  const weekCheckins = myRsvps.filter(
    (r) =>
      r.checkedIn &&
      r.meetup.scheduledAt.getTime() >= weekCutoff.getTime() &&
      r.meetup.scheduledAt.getTime() <= now
  );
  const distinctOthers = new Set<string>();
  for (const r of weekCheckins) {
    for (const other of r.meetup.rsvps) {
      if (other.userId === me) continue;
      if (!other.checkedIn) continue;
      distinctOthers.add(other.userId);
    }
  }

  return NextResponse.json({
    upcoming,
    recent,
    weeklyStats: {
      weekSessions: weekCheckins.length,
      weekCoAttendees: distinctOthers.size,
    },
  });
});

interface MeetupRow {
  id: string;
  hostId: string;
  title: string;
  description: string | null;
  sportTag: string;
  location: string;
  scheduledAt: Date;
  durationMins: number;
  capacity: number | null;
  status: string;
  host: {
    id: string;
    name: string;
    displayName: string | null;
    photoUrl: string | null;
  };
  rsvps: { userId: string; checkedIn: boolean }[];
}

function shape(m: MeetupRow, me: string, viewerCheckedIn: boolean) {
  const goingCount = m.rsvps.length;
  return {
    id: m.id,
    title: m.title,
    description: m.description,
    sportTag: m.sportTag,
    location: m.location,
    scheduledAt: m.scheduledAt,
    durationMins: m.durationMins,
    capacity: m.capacity,
    status: m.status,
    rsvpCount: goingCount,
    isMine: m.hostId === me,
    checkedIn: viewerCheckedIn,
    host: {
      id: m.host.id,
      name: m.host.displayName || m.host.name,
      photoUrl: m.host.photoUrl,
    },
  };
}
