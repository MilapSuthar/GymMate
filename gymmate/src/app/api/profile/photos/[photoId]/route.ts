import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/auth";
import { deleteFile, keyFromPublicUrl } from "@/lib/storage";

export const DELETE = withAuth(async (_req, payload, ctx: { params: Promise<{ photoId: string }> }) => {
  const { photoId } = await ctx.params;

  const photo = await prisma.userPhoto.findUnique({ where: { id: photoId } });
  if (!photo) {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  }
  if (photo.userId !== payload.sub) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.userPhoto.delete({ where: { id: photoId } });

  const key = keyFromPublicUrl(photo.url);
  if (key) {
    try {
      await deleteFile(key);
    } catch (err) {
      console.error("R2 delete failed (orphan object left behind)", err);
    }
  }

  return NextResponse.json({ success: true });
});
