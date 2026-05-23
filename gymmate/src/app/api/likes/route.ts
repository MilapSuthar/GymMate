import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/auth";
import { blockedUserIds } from "@/lib/block";
import { ageFromDob, parseGoals } from "@/lib/profile";

/**
 * GET /api/likes — people who liked the viewer but whom the viewer has not yet
 * swiped on. This is the "who likes you" surface: seeing a non-zero count is
 * one of the strongest daily-open drivers in a swipe product.
 *
 * Liking someone back from here is always an instant match, since they have
 * already liked you — the frontend routes straight into the new conversation.
 */
export const GET = withAuth(async (_req, payload) => {
  const me = payload.sub;

  const [incoming, mySwipes, blocked] = await Promise.all([
    prisma.swipe.findMany({
      where: { swipedId: me, liked: true },
      orderBy: { createdAt: "desc" },
      include: {
        swiper: {
          select: {
            id: true,
            name: true,
            displayName: true,
            age: true,
            dateOfBirth: true,
            bio: true,
            photoUrl: true,
            gymName: true,
            fitnessGoals: true,
            goals: true,
            experienceLevel: true,
            photos: {
              orderBy: { position: "asc" },
              take: 6,
              select: { url: true },
            },
          },
        },
      },
    }),
    prisma.swipe.findMany({
      where: { swiperId: me },
      select: { swipedId: true },
    }),
    blockedUserIds(me),
  ]);

  // Drop anyone the viewer has already acted on, and anyone involved in a
  // block — those likes can never turn into a match.
  const swipedByMe = new Set(mySwipes.map((s) => s.swipedId));

  const likes = incoming
    .filter((s) => !swipedByMe.has(s.swiperId) && !blocked.has(s.swiperId))
    .map((s) => {
      const u = s.swiper;
      const photos =
        u.photos.length > 0
          ? u.photos.map((p) => p.url)
          : u.photoUrl
          ? [u.photoUrl]
          : [];
      return {
        id: u.id,
        name: u.displayName || u.name,
        age: ageFromDob(u.dateOfBirth) ?? u.age ?? null,
        bio: u.bio,
        gymName: u.gymName,
        photoUrl: u.photoUrl,
        photos,
        fitnessGoals: parseGoals(u.fitnessGoals ?? u.goals),
        experienceLevel: u.experienceLevel,
        likedAt: s.createdAt,
      };
    });

  return NextResponse.json({ likes, count: likes.length });
});
