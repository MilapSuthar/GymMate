import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/auth";
import { parseJson } from "@/lib/validation";
import { sendNotification } from "@/lib/notifications";
import { blockExistsBetween } from "@/lib/block";

const swipeSchema = z.object({
  swipeeId: z.string().min(1),
  direction: z.enum(["like", "pass"]),
});

/**
 * POST /api/swipe — record a swipe and create a Match if mutual.
 *
 * Idempotent on (swiperId, swipeeId) via the unique constraint — replaying the
 * same swipe overwrites `liked` rather than creating a duplicate row, which
 * also means the user can change their mind from a "pass" to a "like".
 *
 * Returns { isMatch, match? } — match is included when mutual likes form one.
 */
export const POST = withAuth(async (req, payload) => {
  const parsed = await parseJson(req, swipeSchema);
  if (parsed.error) return parsed.error;
  const { swipeeId, direction } = parsed.data;
  const swiperId = payload.sub;

  if (swipeeId === swiperId) {
    return NextResponse.json(
      { error: "Cannot swipe on yourself" },
      { status: 400 }
    );
  }

  const swipee = await prisma.user.findUnique({
    where: { id: swipeeId },
    select: { id: true },
  });
  if (!swipee) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // If either side has blocked the other, a match must be impossible. Rather
  // than erroring (which would make the frontend bounce the stale card back
  // into the deck), we silently no-op: record nothing and report no match, so
  // the card just clears and the two users can never connect.
  if (await blockExistsBetween(swiperId, swipeeId)) {
    return NextResponse.json({ isMatch: false });
  }

  const liked = direction === "like";

  // Upsert so a re-swipe is harmless (and changeable). The unique
  // (swiperId, swipedId) index makes this O(1).
  await prisma.swipe.upsert({
    where: { swiperId_swipedId: { swiperId, swipedId: swipeeId } },
    create: { swiperId, swipedId: swipeeId, liked },
    update: { liked },
  });

  if (!liked) {
    return NextResponse.json({ isMatch: false });
  }

  // Did the other side already like us? If so, mint a Match (or return
  // the existing one if a previous race created it).
  const reciprocal = await prisma.swipe.findUnique({
    where: { swiperId_swipedId: { swiperId: swipeeId, swipedId: swiperId } },
  });
  if (!reciprocal || !reciprocal.liked) {
    return NextResponse.json({ isMatch: false });
  }

  // Order the pair deterministically so (A,B) and (B,A) both hit the same row.
  const [userAId, userBId] = [swiperId, swipeeId].sort();

  const match = await prisma.match.upsert({
    where: { userAId_userBId: { userAId, userBId } },
    create: { userAId, userBId },
    update: {},
    include: {
      userA: { select: { id: true, name: true, displayName: true, photoUrl: true } },
      userB: { select: { id: true, name: true, displayName: true, photoUrl: true } },
    },
  });

  // Surface "the other person" so the frontend can show the match modal
  // without a follow-up fetch.
  const other = match.userA.id === swiperId ? match.userB : match.userA;
  const me = match.userA.id === swiperId ? match.userA : match.userB;

  // Notify both users that they have a new match (best-effort; never throws)
  await Promise.allSettled([
    sendNotification({
      userId: other.id,
      type: "new_match",
      title: "You have a new GymMate match!",
      body: `You and ${me.displayName || me.name} liked each other.`,
      data: { matchId: match.id, otherUserId: me.id },
    }),
    sendNotification({
      userId: me.id,
      type: "new_match",
      title: "You have a new GymMate match!",
      body: `You and ${other.displayName || other.name} liked each other.`,
      data: { matchId: match.id, otherUserId: other.id },
    }),
  ]);

  return NextResponse.json({
    isMatch: true,
    match: {
      id: match.id,
      createdAt: match.createdAt,
      otherUser: {
        id: other.id,
        name: other.displayName || other.name,
        photoUrl: other.photoUrl,
      },
    },
  });
}, {
  rateLimit: { name: "swipe", limit: 120, windowSeconds: 60 },
});
