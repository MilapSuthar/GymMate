import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/auth";

export const GET = withAuth(async (_req, payload) => {
  const purchases = await prisma.mealPlanPurchase.findMany({
    where: { userId: payload.sub },
    include: {
      mealPlan: {
        include: {
          dietitian: {
            include: { user: { select: { name: true, displayName: true } } },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    plans: purchases.map((p) => ({
      purchaseId: p.id,
      pricePaid: p.pricePaid,
      purchasedAt: p.createdAt,
      id: p.mealPlan.id,
      title: p.mealPlan.title,
      description: p.mealPlan.description,
      caloriesPerDay: p.mealPlan.caloriesPerDay,
      proteinPerDay: p.mealPlan.proteinPerDay,
      carbsPerDay: p.mealPlan.carbsPerDay,
      fatsPerDay: p.mealPlan.fatsPerDay,
      durationWeeks: p.mealPlan.durationWeeks,
      price: p.mealPlan.price,
      tags: p.mealPlan.tags ? p.mealPlan.tags.split(",").filter(Boolean) : [],
      dietitian: p.mealPlan.dietitian.user.displayName || p.mealPlan.dietitian.user.name,
    })),
  });
});
