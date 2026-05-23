import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth";
import { issueTokenPair } from "@/lib/jwt";
import { parseJson, loginSchema } from "@/lib/validation";
import { setRefreshCookie } from "@/lib/cookies";
import { enforceRateLimit, clientIp } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  // Brute-force guard: cap password attempts per source IP.
  const limited = await enforceRateLimit("auth:login", clientIp(req), {
    limit: 10,
    windowSeconds: 300,
  });
  if (limited) return limited;

  const parsed = await parseJson(req, loginSchema);
  if (parsed.error) return parsed.error;
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  // Same response for "no user" and "wrong password" to avoid email enumeration
  if (!user || !user.passwordHash) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const tokens = await issueTokenPair(user.id, user.email);
  const res = NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name },
    ...tokens,
  });
  setRefreshCookie(res, tokens.refreshToken);
  return res;
}
