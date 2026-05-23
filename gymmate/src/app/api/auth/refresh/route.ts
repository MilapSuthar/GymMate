import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  consumeRefreshToken,
  revokeRefreshToken,
  issueTokenPair,
} from "@/lib/jwt";
import { REFRESH_COOKIE, setRefreshCookie, clearRefreshCookie } from "@/lib/cookies";
import { enforceRateLimit, clientIp } from "@/lib/rate-limit";

// 401 helper that also clears the stale refresh cookie. Without this, a stale
// cookie keeps tricking middleware into letting requests through even though
// the token is gone from Redis (very common in dev when the in-memory token
// store is wiped on server restart).
function failAndClearCookie(message: string) {
  const res = NextResponse.json({ error: message }, { status: 401 });
  clearRefreshCookie(res);
  return res;
}

export async function POST(req: NextRequest) {
  // Cap refresh churn per source IP — a fast path, but not one to hammer.
  const limited = await enforceRateLimit("auth:refresh", clientIp(req), {
    limit: 30,
    windowSeconds: 300,
  });
  if (limited) return limited;

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
    return failAndClearCookie("Missing refresh token");
  }

  const userId = await consumeRefreshToken(refreshToken);
  if (!userId) {
    return failAndClearCookie("Invalid or expired refresh token");
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    await revokeRefreshToken(refreshToken);
    return failAndClearCookie("User no longer exists");
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
