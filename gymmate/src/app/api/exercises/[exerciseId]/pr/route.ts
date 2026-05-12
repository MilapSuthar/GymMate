import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/auth";

export const GET = withAuth<{ params: Promise<{ exerciseId: string }> }>(
  async (_req, payload, ctx) => {
    const { exerciseId } = await ctx.params;

    const exercise = await prisma.exercise.findUnique({
      where: { id: exerciseId },
      select: { id: true },
    });
    if (!exercise) {
      return NextResponse.json({ error: "Exercise not found" }, { status: 404 });
    }

    const sets = await prisma.workoutSet.findMany({
      where: {
        exerciseId,
        workoutLog: { userId: payload.sub },
      },
      select: {
        weightKg: true,
        reps: true,
        workoutLog: { select: { date: true } },
      },
    });

    if (sets.length === 0) {
      return NextResponse.json({ pr: null });
    }

    // Best set by volume (weightKg × reps)
    const best = sets.reduce((top, s) =>
      s.weightKg * s.reps > top.weightKg * top.reps ? s : top
    );

    return NextResponse.json({
      pr: {
        weightKg: best.weightKg,
        reps: best.reps,
        volume: best.weightKg * best.reps,
        date: best.workoutLog.date,
      },
    });
  }
);
