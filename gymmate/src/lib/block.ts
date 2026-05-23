import { prisma } from "@/lib/db";

/**
 * True if either user has blocked the other.
 *
 * Blocks are stored one-directional in the schema (blocker → blocked), but
 * every gate in the app treats a block as MUTUAL: once a block exists, the two
 * users disappear from each other everywhere — discover, swipe, matches and
 * messaging. Checking both directions in one query keeps that policy in a
 * single place so callers can't accidentally enforce it half-way.
 */
export async function blockExistsBetween(
  userIdA: string,
  userIdB: string
): Promise<boolean> {
  const block = await prisma.block.findFirst({
    where: {
      OR: [
        { blockerId: userIdA, blockedId: userIdB },
        { blockerId: userIdB, blockedId: userIdA },
      ],
    },
    select: { id: true },
  });
  return block !== null;
}

/**
 * All user IDs that the given user has blocked OR been blocked by. Useful for
 * bulk filtering (e.g. hiding blocked matches from a list) without an N+1.
 */
export async function blockedUserIds(userId: string): Promise<Set<string>> {
  const [out, incoming] = await Promise.all([
    prisma.block.findMany({
      where: { blockerId: userId },
      select: { blockedId: true },
    }),
    prisma.block.findMany({
      where: { blockedId: userId },
      select: { blockerId: true },
    }),
  ]);
  const ids = new Set<string>();
  for (const b of out) ids.add(b.blockedId);
  for (const b of incoming) ids.add(b.blockerId);
  return ids;
}
