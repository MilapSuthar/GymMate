import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/auth";
import { blockedUserIds } from "@/lib/block";
import {
  scheduleOverlap,
  parseLookingFor,
  parseGoals,
} from "@/lib/profile";
import { intersect, whyMatched } from "@/lib/match-reason";
import { haversineKm } from "@/lib/geo";

const OTHER_USER_SELECT = {
  id: true,
  name: true,
  displayName: true,
  photoUrl: true,
  experienceLevel: true,
  gymName: true,
  latitude: true,
  longitude: true,
  gymSchedule: true,
  lookingFor: true,
  fitnessGoals: true,
  isVerified: true,
};

/**
 * GET /api/matches — all matches for the current user, enriched with the
 * fitness-buddy context that the list page needs to render: experience level,
 * distance, schedule overlap, a one-line "why matched," and the last-message
 * preview. Sorted by most recent activity (lastMessage timestamp, or match
 * creation if no chat yet).
 */
export const GET = withAuth(async (_req, payload) => {
  const me = payload.sub;
  const blocked = await blockedUserIds(me);

  const [viewer, matches] = await Promise.all([
    prisma.user.findUnique({
      where: { id: me },
      select: {
        latitude: true,
        longitude: true,
        gymName: true,
        gymSchedule: true,
        lookingFor: true,
        fitnessGoals: true,
      },
    }),
    prisma.match.findMany({
      where: { OR: [{ userAId: me }, { userBId: me }] },
      include: {
        userA: { select: OTHER_USER_SELECT },
        userB: { select: OTHER_USER_SELECT },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { id: true, content: true, senderId: true, createdAt: true },
        },
      },
    }),
  ]);

  // Per-match unread counts in one query — avoids N+1 loops. Kept wrapped in
  // try/catch so a stale Prisma client doesn't take the matches list down;
  // worst case here is "no unread badges this load," not a 500.
  let unreadByMatch = new Map<string, number>();
  try {
    const unreadGrouped = await prisma.message.groupBy({
      by: ["matchId"],
      where: {
        readAt: null,
        senderId: { not: me },
        matchId: { in: matches.map((m) => m.id) },
      },
      _count: { _all: true },
    });
    unreadByMatch = new Map(
      unreadGrouped.map((row) => [row.matchId, row._count._all])
    );
  } catch {
    // Stale client or missing column — fall through with zero unreads.
  }

  const viewerLookingFor = parseLookingFor(viewer?.lookingFor);
  const viewerGoals = parseGoals(viewer?.fitnessGoals);
  const viewerHasCoords =
    viewer?.latitude != null && viewer?.longitude != null;
  const viewerGym = viewer?.gymName?.trim().toLowerCase() ?? "";

  const enriched = matches
    .filter((m) => {
      const otherId = m.userAId === me ? m.userBId : m.userAId;
      return !blocked.has(otherId);
    })
    .map((m) => {
      const other = m.userAId === me ? m.userB : m.userA;
      const last = m.messages[0] ?? null;

      // Match-context computations: distance, schedule overlap, gym match,
      // intent intersection, fitness-goal intersection. Cheap per row.
      const distance =
        viewerHasCoords &&
        other.latitude != null &&
        other.longitude != null
          ? haversineKm(
              viewer!.latitude!,
              viewer!.longitude!,
              other.latitude,
              other.longitude
            )
          : null;
      const overlap = scheduleOverlap(
        viewer?.gymSchedule,
        other.gymSchedule
      );
      const sameGym =
        viewerGym.length > 0 &&
        other.gymName?.trim().toLowerCase() === viewerGym;
      const sharedLookingFor = intersect(
        viewerLookingFor,
        parseLookingFor(other.lookingFor)
      );
      const sharedGoals = intersect(
        viewerGoals,
        parseGoals(other.fitnessGoals)
      );

      return {
        id: m.id,
        createdAt: m.createdAt,
        otherUser: {
          id: other.id,
          name: other.displayName || other.name,
          photoUrl: other.photoUrl,
          experienceLevel: other.experienceLevel,
          gymName: other.gymName,
          isVerified: other.isVerified,
        },
        distanceKm:
          distance != null ? Math.round(distance * 10) / 10 : null,
        overlap,
        sameGym,
        whyMatched: whyMatched({
          sharedLookingFor,
          sharedGoals,
          overlap,
          sameGym,
          distanceKm: distance,
        }),
        lastMessage: last
          ? {
              id: last.id,
              content: last.content,
              fromMe: last.senderId === me,
              createdAt: last.createdAt,
            }
          : null,
        unreadCount: unreadByMatch.get(m.id) ?? 0,
        lastActivityAt: last ? last.createdAt : m.createdAt,
      };
    });

  enriched.sort(
    (a, b) =>
      new Date(b.lastActivityAt).getTime() -
      new Date(a.lastActivityAt).getTime()
  );

  return NextResponse.json({ matches: enriched });
});
