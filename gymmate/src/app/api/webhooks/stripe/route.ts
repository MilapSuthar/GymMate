import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const POST = async (req: NextRequest) => {
  const rawBody = await req.text();
  const sig = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripeKey = process.env.STRIPE_SECRET_KEY;

  if (!stripeKey) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const { default: Stripe } = await import("stripe");
  const stripe = new Stripe(stripeKey, { apiVersion: "2026-04-22.dahlia" });

  let event: ReturnType<typeof stripe.webhooks.constructEvent> extends Promise<infer T> ? T : ReturnType<typeof stripe.webhooks.constructEvent>;

  if (webhookSecret && sig) {
    try {
      event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    } catch {
      return NextResponse.json({ error: "Webhook signature verification failed" }, { status: 400 });
    }
  } else {
    // No webhook secret configured — parse body directly (dev/test only)
    try {
      event = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as { id: string; metadata?: { bookingId?: string } };
    const bookingId = session.metadata?.bookingId;

    if (bookingId) {
      await prisma.booking.update({
        where: { id: bookingId },
        data: {
          paid: true,
          status: "confirmed",
          stripeSessionId: session.id,
        },
      });
    }
  }

  return NextResponse.json({ received: true });
};
