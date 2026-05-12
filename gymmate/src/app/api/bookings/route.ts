import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/auth";

export const GET = withAuth(async (_req, payload) => {
  const bookings = await prisma.booking.findMany({
    where: { clientId: payload.sub },
    orderBy: { scheduledAt: "asc" },
    include: {
      trainer: {
        include: {
          user: { select: { name: true, displayName: true, photoUrl: true, gymName: true } },
        },
      },
    },
  });

  return NextResponse.json({
    bookings: bookings.map((b) => ({
      id: b.id,
      scheduledAt: b.scheduledAt,
      durationMins: b.durationMins,
      notes: b.notes,
      status: b.status,
      paidAmount: b.paidAmount,
      paid: b.paid,
      stripeSessionId: b.stripeSessionId,
      trainer: {
        id: b.trainer.id,
        name: b.trainer.user.displayName || b.trainer.user.name,
        photoUrl: b.trainer.user.photoUrl,
        gym: b.trainer.user.gymName,
        specialty: b.trainer.specialty,
      },
    })),
  });
});
