import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth";
import { issueTokenPair } from "@/lib/jwt";
import { parseJson, loginSchema } from "@/lib/validation";
import { setRefreshCookie } from "@/lib/cookies";

export async function POST(req: NextRequest) {
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
