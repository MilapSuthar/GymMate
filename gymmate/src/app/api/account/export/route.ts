import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/auth";

/**
 * GET /api/account/export — returns a JSON dump of everything we hold on the
 * viewer's account. GDPR/CCPA "right to access." The response is streamed as
 * `application/json` with a Content-Disposition that prompts the browser to
 * save it as `gymmate-<userId>.json`.
 *
 * What's exported: profile, photos, swipes given/received, matches, all
 * messages on those matches, meetups hosted + RSVPed, notifications, blocks
 * and reports the viewer authored.
 *
 * What's NOT exported: passwordHash (security), other users' messages on
 * threads the viewer isn't part of, other users' profiles.
 */
export const GET = withAuth(async (_req, payload) => {
  const me = payload.sub;

  const [
    user,
    photos,
    swipesGiven,
    swipesReceived,
    matches,
    meetupsHosted,
    meetupRsvps,
    notifications,
    blocksSent,
    reportsSent,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: me },
      select: {
        id: true,
        email: true,
        name: true,
        displayName: true,
        bio: true,
        age: true,
        dateOfBirth: true,
        gender: true,
        showMeGenders: true,
        minAgePref: true,
        maxAgePref: true,
        gymName: true,
        latitude: true,
        longitude: true,
        fitnessGoals: true,
        experienceLevel: true,
        gymSchedule: true,
        lookingFor: true,
        photoUrl: true,
        provider: true,
        isVerified: true,
        streakCount: true,
        lastActiveOn: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.userPhoto.findMany({ where: { userId: me } }),
    prisma.swipe.findMany({ where: { swiperId: me } }),
    prisma.swipe.findMany({ where: { swipedId: me } }),
    prisma.match.findMany({
      where: { OR: [{ userAId: me }, { userBId: me }] },
      include: {
        messages: {
          select: {
            id: true,
            senderId: true,
            content: true,
            createdAt: true,
          },
        },
      },
    }),
    prisma.meetup.findMany({
      where: { hostId: me },
      include: { rsvps: true },
    }),
    prisma.meetupRsvp.findMany({
      where: { userId: me },
      include: {
        meetup: {
          select: {
            id: true,
            title: true,
            sportTag: true,
            scheduledAt: true,
          },
        },
      },
    }),
    prisma.notification.findMany({ where: { userId: me } }),
    prisma.block.findMany({ where: { blockerId: me } }),
    prisma.report.findMany({ where: { reporterId: me } }),
  ]);

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const dump = {
    exportedAt: new Date().toISOString(),
    schemaVersion: 1,
    user,
    photos,
    swipesGiven,
    swipesReceived,
    matches,
    meetupsHosted,
    meetupRsvps,
    notifications,
    blocksSent,
    reportsSent,
  };

  // Stream as a downloadable JSON so the browser doesn't try to render it
  // as a page. Filename includes the user id for unambiguous filing.
  return new NextResponse(JSON.stringify(dump, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="gymmate-${me}.json"`,
    },
  });
});
