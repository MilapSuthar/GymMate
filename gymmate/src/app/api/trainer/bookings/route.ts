import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/auth";

const VALID_STATUSES = ["pending", "confirmed", "completed", "cancelled"] as const;

export const GET = withAuth(async (req, payload) => {
  const trainer = await prisma.trainerProfile.findUnique({ where: { userId: payload.sub } });
  if (!trainer) {
    return NextResponse.json({ error: "No trainer profile found" }, { status: 404 });
  }

  const url = new URL(req.url);
  const statusParam = url.searchParams.get("status");
  const statusFilter = VALID_STATUSES.includes(statusParam as (typeof VALID_STATUSES)[number])
    ? (statusParam as string)
    : undefined;

  const bookings = await prisma.booking.findMany({
    where: {
      trainerId: trainer.id,
      ...(statusFilter && { status: statusFilter }),
    },
    orderBy: { scheduledAt: "asc" },
    include: {
      client: { select: { id: true, name: true, displayName: true, photoUrl: true } },
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
      client: {
        id: b.client.id,
        name: b.client.displayName || b.client.name,
        photoUrl: b.client.photoUrl,
      },
    })),
  });
});
