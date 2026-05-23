import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { issueTokenPair } from "@/lib/jwt";
import { parseJson, registerSchema } from "@/lib/validation";
import { setRefreshCookie } from "@/lib/cookies";
import { enforceRateLimit, clientIp } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  // Cap account creation per source IP to curb signup spam.
  const limited = await enforceRateLimit("auth:register", clientIp(req), {
    limit: 5,
    windowSeconds: 600,
  });
  if (limited) return limited;

  const parsed = await parseJson(req, registerSchema);
  if (parsed.error) return parsed.error;
  const { name, email, password, dateOfBirth } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists" },
      { status: 409 }
    );
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
      provider: "credentials",
      // Persist DOB as a UTC midnight Date — the validation step has already
      // confirmed the user is 18+ and the format is YYYY-MM-DD.
      dateOfBirth: new Date(`${dateOfBirth}T00:00:00.000Z`),
    },
  });

  const tokens = await issueTokenPair(user.id, user.email);
  const res = NextResponse.json(
    {
      user: { id: user.id, email: user.email, name: user.name },
      ...tokens,
    },
    { status: 201 }
  );
  setRefreshCookie(res, tokens.refreshToken);
  return res;
}
