import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/auth";
import { parseGoals, scheduleOverlap } from "@/lib/profile";
import { haversineKm } from "@/lib/geo";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

/** Compute integer age from a DOB, or fall back to the legacy `age` column. */
function ageFromUser(u: { dateOfBirth: Date | null; age: number | null }): number | null {
  if (u.dateOfBirth) {
    const now = new Date();
    let years = now.getFullYear() - u.dateOfBirth.getFullYear();
    const m = now.getMonth() - u.dateOfBirth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < u.dateOfBirth.getDate())) years--;
    return years;
  }
  return u.age ?? null;
}

/** Parse a comma-separated string of preferences into a Set. */
function parseCsvSet(value: string | null | undefined): Set<string> {
  const out = new Set<string>();
  if (!value) return out;
  for (const part of value.split(",")) {
    const trimmed = part.trim();
    if (trimmed) out.add(trimmed);
  }
  return out;
}

/**
 * GET /api/discover — paginated list of users to swipe on.
 *
 * Exclusions (applied in order):
 *   1. Self.
 *   2. Anyone the viewer has already swiped on.
 *   3. Anyone the viewer is already matched with.
 *   4. Anyone the viewer blocked, OR anyone who blocked the viewer.
 *   5. Gender preferences — viewer's `showMeGenders` filters the candidate's
 *      `gender`. Candidates with `showMeGenders` set must include the viewer's
 *      gender (so we never show someone to a person they don't want to see).
 *   6. Age preferences — viewer's `minAgePref`/`maxAgePref` filter candidate age;
 *      candidate's age preferences must include the viewer's age.
 *   7. Distance — applied last using haversine.
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
  // Optional "schedule-only" filter: minimum overlap with viewer.
  // Users with no schedule set on their profile are excluded when this is
  // specified, so the result list is meaningful — there's no point ranking
  // by overlap if half the deck has no schedule data.
  const minOverlapParam = parseInt(url.searchParams.get("minOverlap") || "", 10);
  const minOverlap = Number.isFinite(minOverlapParam) && minOverlapParam > 0
    ? minOverlapParam
    : null;

  const [viewer, swipes, matchesA, matchesB, blocksOut, blocksIn] = await Promise.all([
    prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        latitude: true,
        longitude: true,
        gender: true,
        showMeGenders: true,
        minAgePref: true,
        maxAgePref: true,
        dateOfBirth: true,
        age: true,
        gymSchedule: true,
      },
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
    prisma.block.findMany({
      where: { blockerId: payload.sub },
      select: { blockedId: true },
    }),
    prisma.block.findMany({
      where: { blockedId: payload.sub },
      select: { blockerId: true },
    }),
  ]);

  const excludeIds = new Set<string>([payload.sub]);
  for (const s of swipes) excludeIds.add(s.swipedId);
  for (const m of matchesA) excludeIds.add(m.userBId);
  for (const m of matchesB) excludeIds.add(m.userAId);
  for (const b of blocksOut) excludeIds.add(b.blockedId);
  for (const b of blocksIn) excludeIds.add(b.blockerId);

  const viewerHasCoords = viewer?.latitude != null && viewer?.longitude != null;
  const viewerAge = viewer ? ageFromUser(viewer) : null;
  const viewerShowMe = parseCsvSet(viewer?.showMeGenders);

  // Build the SQL-level gender filter. SQLite/Prisma can `IN` on the set so we
  // avoid loading users we'd just throw away. If the viewer hasn't set a
  // preference, skip the filter entirely.
  const genderWhere = viewerShowMe.size > 0
    ? { gender: { in: Array.from(viewerShowMe) } }
    : {};

  // We over-fetch because post-query filters (distance, candidate prefs)
  // can drop a chunk of rows.
  const fetchSize = MAX_LIMIT * 4;

  const users = await prisma.user.findMany({
    where: {
      id: { notIn: Array.from(excludeIds) },
      ...genderWhere,
    },
    include: {
      photos: { orderBy: { position: "asc" }, take: 6 },
    },
    orderBy: { createdAt: "desc" },
    take: fetchSize,
    ...(cursor && { skip: 1, cursor: { id: cursor } }),
  });

  let enriched = users
    .map((u) => {
      const distance =
        viewerHasCoords && u.latitude != null && u.longitude != null
          ? haversineKm(viewer!.latitude!, viewer!.longitude!, u.latitude, u.longitude)
          : null;
      // Schedule overlap — the moat ranking signal. 0 when either side has
      // no schedule set, so the score is "honest" rather than guessed.
      const overlap = scheduleOverlap(viewer?.gymSchedule, u.gymSchedule);
      return { user: u, distance, age: ageFromUser(u), overlap };
    })
    // Viewer's age window applied to candidate's age (if both known).
    .filter(({ age }) => {
      if (age == null) return true; // candidates without age aren't filtered out
      if (viewer?.minAgePref != null && age < viewer.minAgePref) return false;
      if (viewer?.maxAgePref != null && age > viewer.maxAgePref) return false;
      return true;
    })
    // Candidate's age window applied to viewer's age — don't surface a viewer
    // to someone whose preferences exclude them.
    .filter(({ user: u }) => {
      if (viewerAge == null) return true; // can't check, allow through
      if (u.minAgePref != null && viewerAge < u.minAgePref) return false;
      if (u.maxAgePref != null && viewerAge > u.maxAgePref) return false;
      return true;
    })
    // Candidate's gender preferences must include the viewer's gender.
    .filter(({ user: u }) => {
      const candidateShowMe = parseCsvSet(u.showMeGenders);
      if (candidateShowMe.size === 0) return true; // candidate didn't set a pref
      if (!viewer?.gender) return true; // viewer didn't pick a gender — show everyone
      return candidateShowMe.has(viewer.gender);
    });

  if (maxDistance != null && viewerHasCoords) {
    enriched = enriched.filter((e) => e.distance != null && e.distance <= maxDistance);
  }

  if (minOverlap != null) {
    enriched = enriched.filter((e) => e.overlap >= minOverlap);
  }

  // Rank by schedule overlap (desc), with createdAt-newest as the tiebreak.
  // The original SQL ORDER BY already sorted by createdAt desc, but we re-sort
  // in-memory because overlap is computed post-fetch. With fetchSize = 200 this
  // is negligible; if it ever becomes a hot path we'd push overlap into SQL.
  enriched.sort((a, b) => {
    if (b.overlap !== a.overlap) return b.overlap - a.overlap;
    return b.user.createdAt.getTime() - a.user.createdAt.getTime();
  });

  const hasMore = enriched.length > limit;
  const page = hasMore ? enriched.slice(0, limit) : enriched;

  return NextResponse.json({
    users: page.map(({ user: u, distance, age, overlap }) => {
      const photoUrls =
        u.photos.length > 0
          ? u.photos.map((p) => p.url)
          : u.photoUrl
          ? [u.photoUrl]
          : [];
      return {
        id: u.id,
        name: u.displayName || u.name,
        age,
        bio: u.bio,
        gymName: u.gymName,
        fitnessGoals: parseGoals(u.fitnessGoals),
        experienceLevel: u.experienceLevel,
        photoUrl: photoUrls[0] ?? null, // back-compat for older clients
        photos: photoUrls,
        distance: distance != null ? Math.round(distance * 10) / 10 : null,
        overlap, // shared (day, slot) cells with the viewer — 0..35
      };
    }),
    nextCursor: hasMore ? page[page.length - 1].user.id : null,
  });
});
