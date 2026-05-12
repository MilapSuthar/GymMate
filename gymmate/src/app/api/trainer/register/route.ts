import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/auth";
import { parseJson } from "@/lib/validation";

const registerSchema = z.object({
  specialty: z.string().min(1).max(100),
  bio: z.string().min(1).max(1000),
  pricePerSession: z.number().positive(),
  certifications: z.string().max(500).optional(),
  tags: z.string().max(200).optional(),
  gymName: z.string().max(100).optional(),
});

export const POST = withAuth(async (req, payload) => {
  const existing = await prisma.trainerProfile.findUnique({
    where: { userId: payload.sub },
  });
  if (existing) {
    return NextResponse.json({ error: "Trainer profile already exists" }, { status: 409 });
  }

  const parsed = await parseJson(req, registerSchema);
  if (parsed.error) return parsed.error;
  const { specialty, bio, pricePerSession, certifications, tags, gymName } = parsed.data;

  if (gymName) {
    await prisma.user.update({
      where: { id: payload.sub },
      data: { gymName },
    });
  }

  const trainer = await prisma.trainerProfile.create({
    data: {
      userId: payload.sub,
      specialty,
      bio,
      pricePerSession,
      certifications: certifications ?? null,
      tags: tags ?? null,
      verified: false,
    },
    include: {
      user: { select: { id: true, name: true, displayName: true, photoUrl: true, gymName: true } },
    },
  });

  return NextResponse.json(
    {
      trainer: {
        id: trainer.id,
        name: trainer.user.displayName || trainer.user.name,
        gym: trainer.user.gymName,
        specialty: trainer.specialty,
        bio: trainer.bio,
        pricePerSession: trainer.pricePerSession,
        certifications: trainer.certifications,
        tags: trainer.tags ? trainer.tags.split(",").filter(Boolean) : [],
        verified: trainer.verified,
        rating: trainer.rating,
        reviewCount: trainer.reviewCount,
      },
    },
    { status: 201 }
  );
});
