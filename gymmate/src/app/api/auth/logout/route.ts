import { NextRequest, NextResponse } from "next/server";
import { revokeRefreshToken } from "@/lib/jwt";
import { REFRESH_COOKIE, clearRefreshCookie } from "@/lib/cookies";

export async function POST(req: NextRequest) {
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

  if (refreshToken) {
    await revokeRefreshToken(refreshToken);
  }

  const res = NextResponse.json({ success: true });
  clearRefreshCookie(res);
  return res;
}
