import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/auth";
import { parseJson } from "@/lib/validation";

const updateSchema = z.object({
  status: z.enum(["confirmed", "completed", "cancelled"]),
});

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["completed", "cancelled"],
};

export const PATCH = withAuth<{ params: Promise<{ bookingId: string }> }>(
  async (req, payload, ctx) => {
    const { bookingId } = await ctx.params;

    const trainer = await prisma.trainerProfile.findUnique({ where: { userId: payload.sub } });
    if (!trainer) {
      return NextResponse.json({ error: "No trainer profile found" }, { status: 404 });
    }

    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking || booking.trainerId !== trainer.id) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const parsed = await parseJson(req, updateSchema);
    if (parsed.error) return parsed.error;
    const { status } = parsed.data;

    const allowed = ALLOWED_TRANSITIONS[booking.status] ?? [];
    if (!allowed.includes(status)) {
      return NextResponse.json(
        { error: `Cannot transition booking from "${booking.status}" to "${status}"` },
        { status: 422 }
      );
    }

    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: { status },
      include: {
        client: { select: { id: true, name: true, displayName: true, photoUrl: true } },
      },
    });

    return NextResponse.json({
      booking: {
        id: updated.id,
        scheduledAt: updated.scheduledAt,
        durationMins: updated.durationMins,
        notes: updated.notes,
        status: updated.status,
        paidAmount: updated.paidAmount,
        paid: updated.paid,
        client: {
          id: updated.client.id,
          name: updated.client.displayName || updated.client.name,
          photoUrl: updated.client.photoUrl,
        },
      },
    });
  }
);
