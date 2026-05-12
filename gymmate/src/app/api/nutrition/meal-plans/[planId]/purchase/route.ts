import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/auth";

export const POST = withAuth<{ params: Promise<{ planId: string }> }>(
  async (_req, payload, ctx) => {
    const { planId } = await ctx.params;

    const plan = await prisma.mealPlan.findUnique({ where: { id: planId } });
    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    const existing = await prisma.mealPlanPurchase.findFirst({
      where: { userId: payload.sub, mealPlanId: planId },
    });
    if (existing) {
      return NextResponse.json({ error: "Already purchased" }, { status: 409 });
    }

    const purchase = await prisma.mealPlanPurchase.create({
      data: {
        userId: payload.sub,
        mealPlanId: planId,
        pricePaid: plan.price,
      },
    });

    return NextResponse.json({ purchase }, { status: 201 });
  }
);
