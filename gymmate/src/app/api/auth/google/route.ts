import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyGoogleIdToken } from "@/lib/firebase-admin";
import { issueTokenPair } from "@/lib/jwt";
import { parseJson, googleSchema } from "@/lib/validation";

export async function POST(req: NextRequest) {
  const parsed = await parseJson(req, googleSchema);
  if (parsed.error) return parsed.error;
  const { idToken } = parsed.data;

  let google;
  try {
    google = await verifyGoogleIdToken(idToken);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Google token verification failed";
    return NextResponse.json({ error: message }, { status: 401 });
  }

  // Upsert: link by googleId first, fall back to email
  let user = await prisma.user.findUnique({ where: { googleId: google.uid } });
  if (!user) {
    const byEmail = await prisma.user.findUnique({ where: { email: google.email } });
    if (byEmail) {
      user = await prisma.user.update({
        where: { id: byEmail.id },
        data: { googleId: google.uid, provider: byEmail.provider === "credentials" ? byEmail.provider : "google" },
      });
    } else {
      user = await prisma.user.create({
        data: {
          email: google.email,
          name: google.name ?? google.email.split("@")[0],
          photoUrl: google.picture,
          googleId: google.uid,
          provider: "google",
        },
      });
    }
  }

  const tokens = await issueTokenPair(user.id, user.email);
  return NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name, photoUrl: user.photoUrl },
    ...tokens,
  });
}
