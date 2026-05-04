import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  consumeRefreshToken,
  revokeRefreshToken,
  issueTokenPair,
} from "@/lib/jwt";
import { parseJson, refreshSchema } from "@/lib/validation";

export async function POST(req: NextRequest) {
  const parsed = await parseJson(req, refreshSchema);
  if (parsed.error) return parsed.error;
  const { refreshToken } = parsed.data;

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
  return NextResponse.json(tokens);
}
