import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/auth";
import { parseJson } from "@/lib/validation";

function formatTrainer(t: {
  id: string;
  specialty: string;
  bio: string | null;
  pricePerSession: number;
  certifications: string | null;
  tags: string | null;
  verified: boolean;
  rating: number | null;
  reviewCount: number;
  createdAt: Date;
  user: { id: string; name: string; displayName: string | null; photoUrl: string | null; gymName: string | null };
}) {
  return {
    id: t.id,
    name: t.user.displayName || t.user.name,
    photoUrl: t.user.photoUrl,
    gym: t.user.gymName,
    specialty: t.specialty,
    bio: t.bio,
    pricePerSession: t.pricePerSession,
    certifications: t.certifications,
    tags: t.tags ? t.tags.split(",").filter(Boolean) : [],
    verified: t.verified,
    rating: t.rating,
    reviewCount: t.reviewCount,
    createdAt: t.createdAt,
  };
}

export const GET = withAuth(async (_req, payload) => {
  const trainer = await prisma.trainerProfile.findUnique({
    where: { userId: payload.sub },
    include: {
      user: { select: { id: true, name: true, displayName: true, photoUrl: true, gymName: true } },
    },
  });

  if (!trainer) {
    return NextResponse.json({ error: "No trainer profile found" }, { status: 404 });
  }

  return NextResponse.json({ trainer: formatTrainer(trainer) });
});

const updateSchema = z.object({
  specialty: z.string().min(1).max(100).optional(),
  bio: z.string().min(1).max(1000).optional(),
  pricePerSession: z.number().positive().optional(),
  certifications: z.string().max(500).optional(),
  tags: z.string().max(200).optional(),
  gymName: z.string().max(100).optional(),
});

export const PUT = withAuth(async (req, payload) => {
  const existing = await prisma.trainerProfile.findUnique({ where: { userId: payload.sub } });
  if (!existing) {
    return NextResponse.json({ error: "No trainer profile found" }, { status: 404 });
  }

  const parsed = await parseJson(req, updateSchema);
  if (parsed.error) return parsed.error;
  const { specialty, bio, pricePerSession, certifications, tags, gymName } = parsed.data;

  if (gymName !== undefined) {
    await prisma.user.update({ where: { id: payload.sub }, data: { gymName } });
  }

  const trainer = await prisma.trainerProfile.update({
    where: { userId: payload.sub },
    data: {
      ...(specialty !== undefined && { specialty }),
      ...(bio !== undefined && { bio }),
      ...(pricePerSession !== undefined && { pricePerSession }),
      ...(certifications !== undefined && { certifications }),
      ...(tags !== undefined && { tags }),
    },
    include: {
      user: { select: { id: true, name: true, displayName: true, photoUrl: true, gymName: true } },
    },
  });

  return NextResponse.json({ trainer: formatTrainer(trainer) });
});
