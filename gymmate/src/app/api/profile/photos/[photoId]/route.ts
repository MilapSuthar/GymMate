import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/auth";

export const DELETE = withAuth(async (_req, payload, ctx: { params: Promise<{ photoId: string }> }) => {
  const { photoId } = await ctx.params;

  // Make sure the photo belongs to the requesting user
  const photo = await prisma.userPhoto.findUnique({ where: { id: photoId } });
  if (!photo) {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  }
  if (photo.userId !== payload.sub) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.userPhoto.delete({ where: { id: photoId } });

  // Best-effort cleanup of the file on disk — don't error if it's already gone
  if (photo.url.startsWith("/uploads/")) {
    const filepath = path.join(process.cwd(), "public", photo.url);
    try {
      await fs.unlink(filepath);
    } catch {
      // ignore
    }
  }

  return NextResponse.json({ success: true });
});
