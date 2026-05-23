import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyFirebaseIdToken } from "@/lib/firebase-admin";
import { issueTokenPair } from "@/lib/jwt";
import { parseJson } from "@/lib/validation";
import { setRefreshCookie } from "@/lib/cookies";
import { enforceRateLimit, clientIp } from "@/lib/rate-limit";

const schema = z.object({
  idToken: z.string().min(1, "idToken is required"),
});

/**
 * POST /api/auth/firebase
 *
 * Single OAuth endpoint for any Firebase Auth provider (Google today, Apple
 * once Firebase has it enabled). The frontend signs the user in with
 * `signInWithPopup`, grabs `user.getIdToken()`, and POSTs it here.
 *
 * Lookup precedence:
 *   1. firebaseUid (canonical) — fast path for returning OAuth users
 *   2. legacy googleId — pre-Firebase-generic users
 *   3. email — links an OAuth sign-in to an existing credentials account
 *      so users don't end up with two accounts under one email
 */
export async function POST(req: NextRequest) {
  // Guard the OAuth exchange against token-stuffing per source IP.
  const limited = await enforceRateLimit("auth:firebase", clientIp(req), {
    limit: 20,
    windowSeconds: 300,
  });
  if (limited) return limited;

  const parsed = await parseJson(req, schema);
  if (parsed.error) return parsed.error;
  const { idToken } = parsed.data;

  let verified;
  try {
    verified = await verifyFirebaseIdToken(idToken);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Token verification failed";
    return NextResponse.json({ error: message }, { status: 401 });
  }

  let user =
    (await prisma.user.findUnique({ where: { firebaseUid: verified.uid } })) ??
    (await prisma.user.findUnique({ where: { googleId: verified.uid } }));

  if (!user) {
    const byEmail = await prisma.user.findUnique({ where: { email: verified.email } });
    if (byEmail) {
      // Existing email/password account links to this Firebase identity
      user = await prisma.user.update({
        where: { id: byEmail.id },
        data: {
          firebaseUid: verified.uid,
          // Don't downgrade a credentials account's provider — they can use both
          provider: byEmail.provider === "credentials" ? "credentials" : verified.provider,
        },
      });
    } else {
      user = await prisma.user.create({
        data: {
          email: verified.email,
          name: verified.name ?? verified.email.split("@")[0],
          photoUrl: verified.picture,
          firebaseUid: verified.uid,
          // Mirror Google UIDs into the legacy column so older lookups still work
          googleId: verified.provider === "google" ? verified.uid : null,
          provider: verified.provider,
        },
      });
    }
  } else if (!user.firebaseUid) {
    // Backfill firebaseUid for users who only had googleId
    user = await prisma.user.update({
      where: { id: user.id },
      data: { firebaseUid: verified.uid },
    });
  }

  const tokens = await issueTokenPair(user.id, user.email);
  const res = NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name, photoUrl: user.photoUrl },
    ...tokens,
  });
  // Match the credentials-flow behavior: drop the httpOnly refresh cookie so
  // the browser can silent-refresh on subsequent loads.
  setRefreshCookie(res, tokens.refreshToken);
  return res;
}
