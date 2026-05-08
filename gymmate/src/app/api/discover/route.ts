import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/auth";
import { parseGoals } from "@/lib/profile";

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
 */
export const GET = withAuth(async (req, payload) => {
  const url = new URL(req.url);
  const limitParam = parseInt(url.searchParams.get("limit") || "", 10);
  const limit = Number.isFinite(limitParam)
    ? Math.min(Math.max(limitParam, 1), MAX_LIMIT)
    : DEFAULT_LIMIT;
  const cursor = url.searchParams.get("cursor") || undefined;

  // Pull the IDs we need to exclude in two cheap queries up front.
  // For SQLite + tens of thousands of users this is fine; if the swipe table
  // ever grows huge we'd push this to a NOT EXISTS subquery instead.
  const [swipes, matchesA, matchesB] = await Promise.all([
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

  const users = await prisma.user.findMany({
    where: { id: { notIn: Array.from(excludeIds) } },
    include: {
      photos: { orderBy: { position: "asc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
    take: limit + 1, // one extra to know if there's a next page
    ...(cursor && { skip: 1, cursor: { id: cursor } }),
  });

  const hasMore = users.length > limit;
  const page = hasMore ? users.slice(0, limit) : users;

  return NextResponse.json({
    users: page.map((u) => ({
      id: u.id,
      name: u.displayName || u.name,
      age: u.age,
      bio: u.bio,
      gymName: u.gymName,
      fitnessGoals: parseGoals(u.fitnessGoals),
      experienceLevel: u.experienceLevel,
      photoUrl: u.photos[0]?.url ?? u.photoUrl ?? null,
      // Distance is a placeholder until we have geolocation wired up.
      // Frontend renders this as "0.x mi" but it's not real geo data yet.
      distance: null as number | null,
    })),
    nextCursor: hasMore ? page[page.length - 1].id : null,
  });
});
