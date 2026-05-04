import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { issueTokenPair } from "@/lib/jwt";
import { parseJson, registerSchema } from "@/lib/validation";
import { setRefreshCookie } from "@/lib/cookies";

export async function POST(req: NextRequest) {
  const parsed = await parseJson(req, registerSchema);
  if (parsed.error) return parsed.error;
  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists" },
      { status: 409 }
    );
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { email, name, passwordHash, provider: "credentials" },
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
