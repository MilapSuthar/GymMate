import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/auth";
import { parseJson } from "@/lib/validation";

export const GET = withAuth(async (_req, payload) => {
  const logs = await prisma.workoutLog.findMany({
    where: { userId: payload.sub },
    orderBy: { date: "desc" },
    take: 50,
    include: {
      sets: {
        orderBy: { setNumber: "asc" },
        include: {
          exercise: {
            select: { id: true, name: true, muscleGroup: true, category: true },
          },
        },
      },
    },
  });

  return NextResponse.json({
    workouts: logs.map((log) => ({
      id: log.id,
      date: log.date,
      notes: log.notes,
      sets: log.sets.map((s) => ({
        id: s.id,
        setNumber: s.setNumber,
        weightKg: s.weightKg,
        reps: s.reps,
        exercise: s.exercise,
      })),
    })),
  });
});

const setSchema = z.object({
  reps: z.number().int().min(1).max(9999),
  weightKg: z.number().min(0).max(9999),
});

const createSchema = z.object({
  exerciseId: z.string().min(1),
  notes: z.string().max(500).optional(),
  sets: z.array(setSchema).min(1).max(50),
});

export const POST = withAuth(async (req, payload) => {
  const parsed = await parseJson(req, createSchema);
  if (parsed.error) return parsed.error;
  const { exerciseId, notes, sets } = parsed.data;

  const exercise = await prisma.exercise.findUnique({
    where: { id: exerciseId },
    select: { id: true },
  });
  if (!exercise) {
    return NextResponse.json({ error: "Exercise not found" }, { status: 404 });
  }

  const log = await prisma.workoutLog.create({
    data: {
      userId: payload.sub,
      notes: notes ?? null,
      sets: {
        create: sets.map((s, i) => ({
          exerciseId,
          reps: s.reps,
          weightKg: s.weightKg,
          setNumber: i + 1,
        })),
      },
    },
    include: {
      sets: {
        orderBy: { setNumber: "asc" },
        include: {
          exercise: { select: { id: true, name: true } },
        },
      },
    },
  });

  return NextResponse.json(
    {
      workout: {
        id: log.id,
        date: log.date,
        notes: log.notes,
        sets: log.sets.map((s) => ({
          id: s.id,
          setNumber: s.setNumber,
          weightKg: s.weightKg,
          reps: s.reps,
          exercise: s.exercise,
        })),
      },
    },
    { status: 201 }
  );
});
