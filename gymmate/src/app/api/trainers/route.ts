import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/auth";

export const GET = withAuth(async (req) => {
  const url = new URL(req.url);
  const specialty = url.searchParams.get("specialty") || undefined;

  const trainers = await prisma.trainerProfile.findMany({
    where: specialty ? { specialty: { contains: specialty } } : undefined,
    orderBy: { rating: "desc" },
    include: {
      user: {
        select: { id: true, name: true, displayName: true, photoUrl: true, gymName: true },
      },
    },
  });

  return NextResponse.json({
    trainers: trainers.map((t) => ({
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
    })),
  });
});
