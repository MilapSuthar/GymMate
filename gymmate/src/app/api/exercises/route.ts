import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/auth";

export const GET = withAuth(async (req, payload) => {
  const url = new URL(req.url);
  const muscleGroup = url.searchParams.get("muscleGroup") || undefined;
  const category = url.searchParams.get("category") || undefined;

  const exercises = await prisma.exercise.findMany({
    where: {
      ...(muscleGroup && { muscleGroup }),
      ...(category && { category }),
    },
    orderBy: [{ muscleGroup: "asc" }, { name: "asc" }],
  });

  // Fetch the user's best set per exercise (highest weightKg × reps volume)
  const exerciseIds = exercises.map((e) => e.id);
  const userSets = exerciseIds.length
    ? await prisma.workoutSet.findMany({
        where: {
          exerciseId: { in: exerciseIds },
          workoutLog: { userId: payload.sub },
        },
        select: { exerciseId: true, weightKg: true, reps: true },
      })
    : [];

  const prMap: Record<string, { weightKg: number; reps: number }> = {};
  for (const s of userSets) {
    const vol = s.weightKg * s.reps;
    const best = prMap[s.exerciseId];
    if (!best || vol > best.weightKg * best.reps) {
      prMap[s.exerciseId] = { weightKg: s.weightKg, reps: s.reps };
    }
  }

  return NextResponse.json({
    exercises: exercises.map((e) => ({
      id: e.id,
      name: e.name,
      muscleGroup: e.muscleGroup,
      category: e.category,
      difficulty: e.difficulty,
      equipment: e.equipment,
      pr: prMap[e.id] ?? null,
    })),
  });
});
