import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { publicProfile } from "@/lib/profile";

// GET /api/profile/[userId] — public profile (NO sensitive fields)
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ userId: string }> }
) {
  const { userId } = await ctx.params;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { photos: true },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  return NextResponse.json({ profile: publicProfile(user) });
}
