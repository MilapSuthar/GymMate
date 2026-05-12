import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/auth";
import { parseJson } from "@/lib/validation";

const checkoutSchema = z.object({
  bookingId: z.string().min(1),
});

export const POST = withAuth<{ params: Promise<{ trainerId: string }> }>(
  async (req, payload, ctx) => {
    const { trainerId } = await ctx.params;

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return NextResponse.json(
        { error: "Stripe is not configured on this server" },
        { status: 503 }
      );
    }

    const parsed = await parseJson(req, checkoutSchema);
    if (parsed.error) return parsed.error;
    const { bookingId } = parsed.data;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        trainer: {
          include: {
            user: { select: { name: true, displayName: true } },
          },
        },
      },
    });

    if (!booking || booking.clientId !== payload.sub || booking.trainerId !== trainerId) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const { default: Stripe } = await import("stripe");
    const stripe = new Stripe(stripeKey, { apiVersion: "2026-04-22.dahlia" });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const trainerName = booking.trainer.user.displayName || booking.trainer.user.name;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "gbp",
            product_data: {
              name: `PT Session with ${trainerName}`,
              description: `${booking.durationMins ?? 60} min session on ${new Date(booking.scheduledAt).toLocaleDateString("en-GB")}`,
            },
            unit_amount: Math.round(booking.paidAmount * 100),
          },
          quantity: 1,
        },
      ],
      metadata: { bookingId: booking.id },
      success_url: `${appUrl}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/booking/cancel?booking_id=${booking.id}`,
    });

    await prisma.booking.update({
      where: { id: booking.id },
      data: { stripeSessionId: session.id },
    });

    return NextResponse.json({ url: session.url });
  }
);
