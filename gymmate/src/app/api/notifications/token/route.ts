import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/auth";
import { parseJson } from "@/lib/validation";

const tokenSchema = z.object({
  token: z.string().min(1).max(500),
});

export const POST = withAuth(async (req, payload) => {
  const parsed = await parseJson(req, tokenSchema);
  if (parsed.error) return parsed.error;
  const { token } = parsed.data;

  await prisma.user.update({
    where: { id: payload.sub },
    data: { fcmToken: token },
  });

  return NextResponse.json({ ok: true });
});

export const DELETE = withAuth(async (_req, payload) => {
  await prisma.user.update({
    where: { id: payload.sub },
    data: { fcmToken: null },
  });
  return NextResponse.json({ ok: true });
});
