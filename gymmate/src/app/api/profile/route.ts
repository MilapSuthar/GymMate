import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/auth";
import { parseJson } from "@/lib/validation";
import {
  EXPERIENCE_LEVELS,
  FITNESS_GOALS,
  joinGoals,
  publicProfile,
} from "@/lib/profile";

// GET /api/profile — current user's full profile (private)
export const GET = withAuth(async (_req, payload) => {
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    include: { photos: true },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  return NextResponse.json({
    profile: {
      ...publicProfile(user),
      email: user.email, // private extras
    },
  });
});

const updateSchema = z.object({
  displayName: z.string().trim().max(100).optional().nullable(),
  bio: z.string().trim().max(1000).optional().nullable(),
  gymName: z.string().trim().max(200).optional().nullable(),
  fitnessGoals: z
    .array(z.enum(FITNESS_GOALS))
    .max(FITNESS_GOALS.length)
    .optional(),
  experienceLevel: z.enum(EXPERIENCE_LEVELS).optional().nullable(),
  age: z.number().int().min(13).max(120).optional().nullable(),
});

// PUT /api/profile — update the User row
export const PUT = withAuth(async (req, payload) => {
  const parsed = await parseJson(req, updateSchema);
  if (parsed.error) return parsed.error;
  const data = parsed.data;

  const updated = await prisma.user.update({
    where: { id: payload.sub },
    data: {
      ...(data.displayName !== undefined && { displayName: data.displayName }),
      ...(data.bio !== undefined && { bio: data.bio }),
      ...(data.gymName !== undefined && { gymName: data.gymName }),
      ...(data.experienceLevel !== undefined && { experienceLevel: data.experienceLevel }),
      ...(data.age !== undefined && { age: data.age }),
      ...(data.fitnessGoals !== undefined && {
        fitnessGoals: joinGoals(data.fitnessGoals),
      }),
    },
    include: { photos: true },
  });

  return NextResponse.json({
    profile: { ...publicProfile(updated), email: updated.email },
  });
});

