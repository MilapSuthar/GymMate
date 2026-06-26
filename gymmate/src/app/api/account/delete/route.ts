import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/auth";
import { verifyPassword } from "@/lib/auth";
import { parseJson } from "@/lib/validation";
import { clearRefreshCookie } from "@/lib/cookies";

const deleteSchema = z.object({
  /**
   * Required for credentials accounts: the user's current password, so we
   * verify identity before we cascade-delete. OAuth-only accounts (Firebase
   * Google/Apple) don't have a passwordHash, so we accept an empty string
   * for them; they're already authenticated by the bearer token withAuth
   * validated.
   */
  password: z.string().optional(),
  /** Acknowledgement that this is permanent. */
  confirm: z.literal("DELETE"),
});

/**
 * POST /api/account/delete — permanently removes the viewer's account and
 * everything tied to it. GDPR/CCPA "right to erasure."
 *
 * What gets deleted: User row, photos, swipes (both directions), matches the
 * user is in (and all messages on those threads), meetups they hosted (and
 * all RSVPs), their RSVPs to others' meetups, notifications, blocks and
 * reports they authored. This cascades so other users' threads aren't left
 * pointing at a ghost row.
 *
 * Returns 204 and clears the refresh cookie so the client lands on /login.
 */
export const POST = withAuth(
  async (req, payload) => {
    const me = payload.sub;
    const parsed = await parseJson(req, deleteSchema);
    if (parsed.error) return parsed.error;
    const { password } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { id: me },
      select: { id: true, passwordHash: true, provider: true },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Credentials accounts must re-verify their password; OAuth-only accounts
    // (no passwordHash) skip this because the bearer token already proved
    // they're signed in via the OAuth provider.
    if (user.passwordHash) {
      if (!password) {
        return NextResponse.json(
          { error: "Password is required to delete your account" },
          { status: 400 }
        );
      }
      const ok = await verifyPassword(password, user.passwordHash);
      if (!ok) {
        return NextResponse.json(
          { error: "Password is incorrect" },
          { status: 401 }
        );
      }
    }

    // Cascade deletes for everything not covered by onDelete: Cascade in the
    // schema. Order matters where rows reference each other.
    const matchIds = (
      await prisma.match.findMany({
        where: { OR: [{ userAId: me }, { userBId: me }] },
        select: { id: true },
      })
    ).map((m) => m.id);

    const hostedMeetupIds = (
      await prisma.meetup.findMany({
        where: { hostId: me },
        select: { id: true },
      })
    ).map((m) => m.id);

    await prisma.$transaction([
      // Chat: messages then matches.
      prisma.message.deleteMany({ where: { matchId: { in: matchIds } } }),
      prisma.match.deleteMany({ where: { id: { in: matchIds } } }),
      // Swipes (both sides — the user's likes and any incoming likes).
      prisma.swipe.deleteMany({
        where: { OR: [{ swiperId: me }, { swipedId: me }] },
      }),
      // Likes-board and answer-board content authored by the user.
      prisma.answerLike.deleteMany({ where: { userId: me } }),
      prisma.questionLike.deleteMany({ where: { userId: me } }),
      prisma.answer.deleteMany({ where: { authorId: me } }),
      prisma.question.deleteMany({ where: { authorId: me } }),
      // Meetups hosted: their RSVPs cascade via FK; meetups the user RSVP'd
      // to elsewhere just need the RSVP row dropped.
      prisma.meetupRsvp.deleteMany({
        where: { OR: [{ userId: me }, { meetupId: { in: hostedMeetupIds } }] },
      }),
      prisma.meetup.deleteMany({ where: { id: { in: hostedMeetupIds } } }),
      // Safety + system.
      prisma.notification.deleteMany({ where: { userId: me } }),
      prisma.block.deleteMany({
        where: { OR: [{ blockerId: me }, { blockedId: me }] },
      }),
      prisma.report.deleteMany({
        where: { OR: [{ reporterId: me }, { reportedId: me }] },
      }),
      prisma.userPhoto.deleteMany({ where: { userId: me } }),
      // Trainer / dietitian / nutrition surfaces — hidden in V1 but kept in
      // the schema, so the cascade still needs to happen.
      prisma.booking.deleteMany({ where: { clientId: me } }),
      prisma.nutritionLog.deleteMany({ where: { userId: me } }),
      prisma.mealPlanPurchase.deleteMany({ where: { userId: me } }),
      // Finally the user row itself.
      prisma.user.delete({ where: { id: me } }),
    ]);

    // Drop the refresh cookie so the client immediately becomes anonymous.
    const res = NextResponse.json({ deleted: true }, { status: 200 });
    clearRefreshCookie(res);
    return res;
  },
  { rateLimit: { name: "account-delete", limit: 3, windowSeconds: 600 } }
);
