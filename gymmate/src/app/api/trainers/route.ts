import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/auth";
import { haversineKm } from "@/lib/geo";

export const GET = withAuth(async (req, payload) => {
  const url = new URL(req.url);
  const specialty = url.searchParams.get("specialty") || undefined;
  const maxDistanceParam = parseFloat(url.searchParams.get("maxDistance") || "");
  const maxDistance =
    Number.isFinite(maxDistanceParam) && maxDistanceParam > 0 ? maxDistanceParam : null;

  const [viewer, trainers] = await Promise.all([
    prisma.user.findUnique({
      where: { id: payload.sub },
      select: { latitude: true, longitude: true },
    }),
    prisma.trainerProfile.findMany({
      where: specialty ? { specialty: { contains: specialty } } : undefined,
      orderBy: { rating: "desc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            displayName: true,
            photoUrl: true,
            gymName: true,
            latitude: true,
            longitude: true,
          },
        },
      },
    }),
  ]);

  const viewerHasCoords = viewer?.latitude != null && viewer?.longitude != null;

  let enriched = trainers.map((t) => {
    const distance =
      viewerHasCoords && t.user.latitude != null && t.user.longitude != null
        ? haversineKm(
            viewer!.latitude!,
            viewer!.longitude!,
            t.user.latitude,
            t.user.longitude
          )
        : null;
    return { trainer: t, distance };
  });

  if (maxDistance != null && viewerHasCoords) {
    enriched = enriched.filter((e) => e.distance != null && e.distance <= maxDistance);
  }

  // Sort by distance ascending when viewer has coords; otherwise keep rating order
  if (viewerHasCoords) {
    enriched.sort((a, b) => {
      if (a.distance == null && b.distance == null) return 0;
      if (a.distance == null) return 1;
      if (b.distance == null) return -1;
      return a.distance - b.distance;
    });
  }

  return NextResponse.json({
    trainers: enriched.map(({ trainer: t, distance }) => ({
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
      distance: distance != null ? Math.round(distance * 10) / 10 : null,
    })),
  });
});
