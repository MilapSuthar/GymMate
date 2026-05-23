import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/auth";
import { parseJson } from "@/lib/validation";
import {
  EXPERIENCE_LEVELS,
  FITNESS_GOALS,
  GENDERS,
  MAX_USER_AGE,
  MIN_USER_AGE,
  SCHEDULE_DAYS,
  SCHEDULE_SLOTS,
  joinGenders,
  joinGoals,
  joinSchedule,
  publicProfile,
  type ScheduleToken,
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

const updateSchema = z
  .object({
    displayName: z.string().trim().max(100).optional().nullable(),
    bio: z.string().trim().max(1000).optional().nullable(),
    gymName: z.string().trim().max(200).optional().nullable(),
    fitnessGoals: z
      .array(z.enum(FITNESS_GOALS))
      .max(FITNESS_GOALS.length)
      .optional(),
    experienceLevel: z.enum(EXPERIENCE_LEVELS).optional().nullable(),
    age: z.number().int().min(MIN_USER_AGE).max(MAX_USER_AGE).optional().nullable(),
    gender: z.enum(GENDERS).optional().nullable(),
    showMeGenders: z.array(z.enum(GENDERS)).max(GENDERS.length).optional(),
    minAgePref: z.number().int().min(MIN_USER_AGE).max(MAX_USER_AGE).optional().nullable(),
    maxAgePref: z.number().int().min(MIN_USER_AGE).max(MAX_USER_AGE).optional().nullable(),
    // Array of `day_slot` tokens. We validate each token client- and server-side
    // by enum-checking both halves so a malformed string can't sneak in.
    gymSchedule: z
      .array(
        z.string().refine(
          (t) => {
            const [d, s] = t.split("_");
            return (
              (SCHEDULE_DAYS as readonly string[]).includes(d) &&
              SCHEDULE_SLOTS.some((slot) => slot.key === s)
            );
          },
          { message: "Invalid schedule token" }
        )
      )
      .max(SCHEDULE_DAYS.length * SCHEDULE_SLOTS.length)
      .optional(),
  })
  .refine(
    (d) =>
      d.minAgePref == null || d.maxAgePref == null || d.minAgePref <= d.maxAgePref,
    { message: "minAgePref must be <= maxAgePref", path: ["minAgePref"] }
  );

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
      ...(data.gender !== undefined && { gender: data.gender }),
      ...(data.minAgePref !== undefined && { minAgePref: data.minAgePref }),
      ...(data.maxAgePref !== undefined && { maxAgePref: data.maxAgePref }),
      ...(data.fitnessGoals !== undefined && {
        fitnessGoals: joinGoals(data.fitnessGoals),
      }),
      ...(data.showMeGenders !== undefined && {
        showMeGenders: joinGenders(data.showMeGenders),
      }),
      ...(data.gymSchedule !== undefined && {
        gymSchedule: joinSchedule(data.gymSchedule as ScheduleToken[]),
      }),
    },
    include: { photos: true },
  });

  return NextResponse.json({
    profile: { ...publicProfile(updated), email: updated.email },
  });
});

