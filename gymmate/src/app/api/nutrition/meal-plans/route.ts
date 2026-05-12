import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/auth";

export const GET = withAuth(async (_req, payload) => {
  const [plans, purchases] = await Promise.all([
    prisma.mealPlan.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        dietitian: {
          include: { user: { select: { name: true, displayName: true } } },
        },
      },
    }),
    prisma.mealPlanPurchase.findMany({
      where: { userId: payload.sub },
      select: { mealPlanId: true },
    }),
  ]);

  const purchasedIds = new Set(purchases.map((p) => p.mealPlanId));

  return NextResponse.json({
    plans: plans.map((p) => ({
      id: p.id,
      title: p.title,
      description: p.description,
      caloriesPerDay: p.caloriesPerDay,
      proteinPerDay: p.proteinPerDay,
      carbsPerDay: p.carbsPerDay,
      fatsPerDay: p.fatsPerDay,
      durationWeeks: p.durationWeeks,
      price: p.price,
      tags: p.tags ? p.tags.split(",").filter(Boolean) : [],
      dietitian: p.dietitian.user.displayName || p.dietitian.user.name,
      purchased: purchasedIds.has(p.id),
    })),
  });
});
