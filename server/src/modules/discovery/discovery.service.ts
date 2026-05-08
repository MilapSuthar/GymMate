import { prisma } from "../../config/db";
import { redis } from "../../config/redis";

interface DiscoveryQuery {
  userId: string;
  radiusKm?: number;
  limit?: number;
  fitnessLevels?: string[];
}

interface RawUserRow {
  id: string;
  display_name: string;
  avatar_url: string | null;
  photos: string[];
  gym_name: string | null;
  fitness_level: string | null;
  goals: string[];
  bio: string | null;
  distance_m: number;
}

export async function getDiscoveryFeed({ userId, radiusKm = 25, limit = 20, fitnessLevels }: DiscoveryQuery) {
  const cacheKey = `discovery:${userId}:${radiusKm}`;
  const cached = await redis.get(cacheKey).catch(() => null);
  if (cached) return JSON.parse(cached);

  // Get already-swiped IDs and blocked IDs to exclude
  const [swipedRows, blocksGiven, blocksReceived] = await Promise.all([
    prisma.swipe.findMany({ where: { swiperId: userId }, select: { swipedId: true } }),
    prisma.block.findMany({ where: { blockerId: userId }, select: { blockedId: true } }),
    prisma.block.findMany({ where: { blockedId: userId }, select: { blockerId: true } }),
  ]);

  const excludeIds = [
    userId,
    ...swipedRows.map((s) => s.swipedId),
    ...blocksGiven.map((b) => b.blockedId),
    ...blocksReceived.map((b) => b.blockerId),
  ];

  const radiusM = radiusKm * 1000;

  // Use ST_DWithin on the PostGIS geography column — uses GiST index
  const users = await prisma.$queryRaw<RawUserRow[]>`
    SELECT
      u.id,
      u.display_name,
      u.avatar_url,
      u.photos,
      u.gym_name,
      u.fitness_level,
      u.goals,
      u.bio,
      ST_Distance(u.gym_location, src.gym_location) AS distance_m
    FROM users u
    JOIN users src ON src.id = ${userId}::uuid
    WHERE u.id <> ${userId}::uuid
      AND u.id != ALL(${excludeIds}::uuid[])
      AND u.is_active = true
      AND src.gym_location IS NOT NULL
      AND u.gym_location IS NOT NULL
      AND ST_DWithin(u.gym_location, src.gym_location, ${radiusM})
      ${fitnessLevels && fitnessLevels.length > 0
        ? prisma.$queryRaw`AND u.fitness_level = ANY(${fitnessLevels}::text[])`
        : prisma.$queryRaw``}
    ORDER BY distance_m ASC
    LIMIT ${limit}
  `;

  await redis.setex(cacheKey, 60, JSON.stringify(users)).catch(() => null);
  return users;
}

export function invalidateDiscoveryCache(userId: string) {
  return redis.del(`discovery:${userId}:*`).catch(() => null);
}
