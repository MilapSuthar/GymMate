import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/auth";
import { parseGoals } from "@/lib/profile";
import { haversineKm } from "@/lib/geo";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

/**
 * GET /api/discover — paginated list of users to swipe on.
 * Excludes: self, anyone the current user has already swiped on,
 * and anyone the current user is already matched with.
 *
 * Query params:
 *   - limit (1..50, default 20)
 *   - cursor (User.id) — opaque cursor for keyset pagination
 *   - maxDistance (km) — only return users within this radius of viewer
 */
export const GET = withAuth(async (req, payload) => {
  const url = new URL(req.url);
  const limitParam = parseInt(url.searchParams.get("limit") || "", 10);
  const limit = Number.isFinite(limitParam)
    ? Math.min(Math.max(limitParam, 1), MAX_LIMIT)
    : DEFAULT_LIMIT;
  const cursor = url.searchParams.get("cursor") || undefined;
  const maxDistanceParam = parseFloat(url.searchParams.get("maxDistance") || "");
  const maxDistance = Number.isFinite(maxDistanceParam) && maxDistanceParam > 0
    ? maxDistanceParam
    : null;

  const [viewer, swipes, matchesA, matchesB] = await Promise.all([
    prisma.user.findUnique({
      where: { id: payload.sub },
      select: { latitude: true, longitude: true },
    }),
    prisma.swipe.findMany({
      where: { swiperId: payload.sub },
      select: { swipedId: true },
    }),
    prisma.match.findMany({
      where: { userAId: payload.sub },
      select: { userBId: true },
    }),
    prisma.match.findMany({
      where: { userBId: payload.sub },
      select: { userAId: true },
    }),
  ]);

  const excludeIds = new Set<string>([payload.sub]);
  for (const s of swipes) excludeIds.add(s.swipedId);
  for (const m of matchesA) excludeIds.add(m.userBId);
  for (const m of matchesB) excludeIds.add(m.userAId);

  const viewerHasCoords = viewer?.latitude != null && viewer?.longitude != null;

  // When filtering by distance we need to fetch more than `limit` because
  // some candidates will be filtered out post-query. Over-fetch generously.
  const fetchSize = maxDistance != null && viewerHasCoords ? MAX_LIMIT * 4 : limit + 1;

  const users = await prisma.user.findMany({
    where: { id: { notIn: Array.from(excludeIds) } },
    include: {
      photos: { orderBy: { position: "asc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
    take: fetchSize,
    ...(cursor && { skip: 1, cursor: { id: cursor } }),
  });

  let enriched = users.map((u) => {
    const distance =
      viewerHasCoords && u.latitude != null && u.longitude != null
        ? haversineKm(viewer!.latitude!, viewer!.longitude!, u.latitude, u.longitude)
        : null;
    return { user: u, distance };
  });

  if (maxDistance != null && viewerHasCoords) {
    // Keep users within radius. Users with unknown coords are excluded when
    // an explicit radius filter is set — otherwise the slider does nothing.
    enriched = enriched.filter((e) => e.distance != null && e.distance <= maxDistance);
  }

  const hasMore = enriched.length > limit;
  const page = hasMore ? enriched.slice(0, limit) : enriched;

  return NextResponse.json({
    users: page.map(({ user: u, distance }) => ({
      id: u.id,
      name: u.displayName || u.name,
      age: u.age,
      bio: u.bio,
      gymName: u.gymName,
      fitnessGoals: parseGoals(u.fitnessGoals),
      experienceLevel: u.experienceLevel,
      photoUrl: u.photos[0]?.url ?? u.photoUrl ?? null,
      distance: distance != null ? Math.round(distance * 10) / 10 : null,
    })),
    nextCursor: hasMore ? page[page.length - 1].user.id : null,
  });
});
