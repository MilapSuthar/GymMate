import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  consumeRefreshToken,
  revokeRefreshToken,
  issueTokenPair,
} from "@/lib/jwt";
import { REFRESH_COOKIE, setRefreshCookie } from "@/lib/cookies";

export async function POST(req: NextRequest) {
  // Read from httpOnly cookie first (browser flow), fall back to JSON body (CLI / mobile clients).
  const cookieToken = req.cookies.get(REFRESH_COOKIE)?.value;
  let refreshToken = cookieToken;
  if (!refreshToken) {
    try {
      const body = await req.json();
      if (body && typeof body.refreshToken === "string") refreshToken = body.refreshToken;
    } catch {
      // no body — fine
    }
  }

  if (!refreshToken) {
    return NextResponse.json({ error: "Missing refresh token" }, { status: 401 });
  }

  const userId = await consumeRefreshToken(refreshToken);
  if (!userId) {
    return NextResponse.json({ error: "Invalid or expired refresh token" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    await revokeRefreshToken(refreshToken);
    return NextResponse.json({ error: "User no longer exists" }, { status: 401 });
  }

  // Rotate: revoke old refresh token and issue a fresh pair (defense in depth)
  await revokeRefreshToken(refreshToken);
  const tokens = await issueTokenPair(user.id, user.email);
  const res = NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name },
    ...tokens,
  });
  setRefreshCookie(res, tokens.refreshToken);
  return res;
}
