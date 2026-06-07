import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/auth";
import { blockedUserIds } from "@/lib/block";
import { parseJson } from "@/lib/validation";
import {
  SPORT_TAGS,
  MIN_DURATION_MINS,
  MAX_DURATION_MINS,
  MIN_CAPACITY,
  MAX_CAPACITY,
} from "@/lib/meetup";

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

/**
 * POST /api/meetups — host creates a meetup.
 *
 * Validates: future date, sport tag from the canonical set, sensible duration
 * and capacity bounds. The host's own RSVP (status="going") is created in the
 * same transaction so capacity math and the going count include the host
 * naturally — no special-cased host arithmetic anywhere downstream.
 */
const createSchema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().max(2000).optional(),
  sportTag: z.enum(SPORT_TAGS),
  location: z.string().trim().min(2).max(200),
  scheduledAt: z.string().min(1),
  durationMins: z
    .number()
    .int()
    .min(MIN_DURATION_MINS)
    .max(MAX_DURATION_MINS)
    .optional(),
  capacity: z.number().int().min(MIN_CAPACITY).max(MAX_CAPACITY).optional(),
});

export const POST = withAuth(
  async (req, payload) => {
    const parsed = await parseJson(req, createSchema);
    if (parsed.error) return parsed.error;
    const {
      title,
      description,
      sportTag,
      location,
      scheduledAt,
      durationMins,
      capacity,
    } = parsed.data;

    const start = new Date(scheduledAt);
    if (Number.isNaN(start.getTime())) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }
    if (start.getTime() <= Date.now()) {
      return NextResponse.json(
        { error: "Meetup must be in the future" },
        { status: 400 }
      );
    }

    const meetup = await prisma.$transaction(async (tx) => {
      const created = await tx.meetup.create({
        data: {
          hostId: payload.sub,
          title,
          description: description ?? null,
          sportTag,
          location,
          scheduledAt: start,
          durationMins: durationMins ?? 60,
          capacity: capacity ?? null,
          status: "open",
        },
      });
      await tx.meetupRsvp.create({
        data: {
          meetupId: created.id,
          userId: payload.sub,
          status: "going",
        },
      });
      return created;
    });

    return NextResponse.json({ meetup: { id: meetup.id } }, { status: 201 });
  },
  { rateLimit: { name: "meetup-create", limit: 5, windowSeconds: 300 } }
);
