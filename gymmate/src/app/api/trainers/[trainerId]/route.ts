import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/auth";

export const GET = withAuth<{ params: Promise<{ trainerId: string }> }>(
  async (_req, _payload, ctx) => {
    const { trainerId } = await ctx.params;

    const trainer = await prisma.trainerProfile.findUnique({
      where: { id: trainerId },
      include: {
        user: {
          select: { id: true, name: true, displayName: true, photoUrl: true, gymName: true },
        },
      },
    });

    if (!trainer) {
      return NextResponse.json({ error: "Trainer not found" }, { status: 404 });
    }

    return NextResponse.json({
      trainer: {
        id: trainer.id,
        name: trainer.user.displayName || trainer.user.name,
        photoUrl: trainer.user.photoUrl,
        gym: trainer.user.gymName,
        specialty: trainer.specialty,
        bio: trainer.bio,
        pricePerSession: trainer.pricePerSession,
        certifications: trainer.certifications,
        tags: trainer.tags ? trainer.tags.split(",").filter(Boolean) : [],
        verified: trainer.verified,
        rating: trainer.rating,
        reviewCount: trainer.reviewCount,
        createdAt: trainer.createdAt,
      },
    });
  }
);
