import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/auth";
import { parseJson } from "@/lib/validation";

const bookSchema = z.object({
  scheduledAt: z.string().min(1),
  durationMins: z.number().int().min(30).max(180).optional(),
  notes: z.string().max(500).optional(),
});

export const POST = withAuth<{ params: Promise<{ trainerId: string }> }>(
  async (req, payload, ctx) => {
    const { trainerId } = await ctx.params;

    const trainer = await prisma.trainerProfile.findUnique({ where: { id: trainerId } });
    if (!trainer) {
      return NextResponse.json({ error: "Trainer not found" }, { status: 404 });
    }

    const parsed = await parseJson(req, bookSchema);
    if (parsed.error) return parsed.error;
    const { scheduledAt, durationMins, notes } = parsed.data;

    const booking = await prisma.booking.create({
      data: {
        clientId: payload.sub,
        trainerId,
        scheduledAt: new Date(scheduledAt),
        durationMins: durationMins ?? 60,
        notes: notes ?? null,
        paidAmount: trainer.pricePerSession,
        status: "pending",
        paid: false,
      },
    });

    return NextResponse.json({ booking }, { status: 201 });
  }
);
