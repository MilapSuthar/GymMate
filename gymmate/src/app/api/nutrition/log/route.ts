import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/auth";
import { parseJson } from "@/lib/validation";

export const GET = withAuth(async (req, payload) => {
  const url = new URL(req.url);
  const dateParam = url.searchParams.get("date");

  const day = dateParam ? new Date(dateParam) : new Date();
  const start = new Date(day);
  start.setHours(0, 0, 0, 0);
  const end = new Date(day);
  end.setHours(23, 59, 59, 999);

  const logs = await prisma.nutritionLog.findMany({
    where: {
      userId: payload.sub,
      date: { gte: start, lte: end },
    },
    orderBy: { createdAt: "asc" },
  });

  const totals = logs.reduce(
    (acc, l) => ({
      calories: acc.calories + l.calories,
      protein: acc.protein + l.protein,
      carbs: acc.carbs + l.carbs,
      fats: acc.fats + l.fats,
    }),
    { calories: 0, protein: 0, carbs: 0, fats: 0 }
  );

  return NextResponse.json({ totals, entries: logs });
});

const logSchema = z.object({
  name: z.string().min(1).max(200),
  mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]).optional(),
  calories: z.number().int().min(0),
  protein: z.number().min(0),
  carbs: z.number().min(0),
  fats: z.number().min(0),
  notes: z.string().max(500).optional(),
  date: z.string().optional(),
});

export const POST = withAuth(async (req, payload) => {
  const parsed = await parseJson(req, logSchema);
  if (parsed.error) return parsed.error;
  const { name, mealType, calories, protein, carbs, fats, notes, date } = parsed.data;

  const logDate = date ? new Date(date) : new Date();

  const entry = await prisma.nutritionLog.create({
    data: {
      userId: payload.sub,
      date: logDate,
      name,
      mealType: mealType ?? null,
      calories,
      protein,
      carbs,
      fats,
      notes: notes ?? null,
    },
  });

  return NextResponse.json({ entry }, { status: 201 });
});
