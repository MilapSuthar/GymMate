import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/auth";
import { parseJson } from "@/lib/validation";

const locationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export const PUT = withAuth(async (req, payload) => {
  const parsed = await parseJson(req, locationSchema);
  if (parsed.error) return parsed.error;
  const { latitude, longitude } = parsed.data;

  const user = await prisma.user.update({
    where: { id: payload.sub },
    data: { latitude, longitude },
    select: { id: true, latitude: true, longitude: true },
  });

  return NextResponse.json({ user });
});
