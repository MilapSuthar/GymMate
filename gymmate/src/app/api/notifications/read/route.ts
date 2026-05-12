import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/auth";
import { parseJson } from "@/lib/validation";

const readSchema = z.object({
  ids: z.array(z.string()).optional(),
  all: z.boolean().optional(),
});

export const POST = withAuth(async (req, payload) => {
  const parsed = await parseJson(req, readSchema);
  if (parsed.error) return parsed.error;
  const { ids, all } = parsed.data;

  if (all) {
    await prisma.notification.updateMany({
      where: { userId: payload.sub, read: false },
      data: { read: true },
    });
  } else if (ids && ids.length > 0) {
    await prisma.notification.updateMany({
      where: { userId: payload.sub, id: { in: ids } },
      data: { read: true },
    });
  } else {
    return NextResponse.json({ error: "Provide ids[] or all:true" }, { status: 400 });
  }

  const unreadCount = await prisma.notification.count({
    where: { userId: payload.sub, read: false },
  });

  return NextResponse.json({ ok: true, unreadCount });
});
