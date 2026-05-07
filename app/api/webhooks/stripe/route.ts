import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import type Stripe from "stripe";

import { db } from "@/db";
import { stripeEvent, subscription } from "@/db/schema";
import { stripe } from "@/lib/stripe";

export const runtime = "nodejs";          // Stripe raw-body verification needs Node runtime
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return new NextResponse("webhook secret not configured", { status: 503 });

  const sig = req.headers.get("stripe-signature");
  if (!sig) return new NextResponse("missing signature", { status: 400 });

  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, secret);
  } catch (e) {
    return new NextResponse(`invalid signature: ${(e as Error).message}`, { status: 400 });
  }

  // Idempotency — Stripe may redeliver the same event
  const existing = await db.query.stripeEvent.findFirst({
    where: eq(stripeEvent.id, event.id),
  });
  if (existing) return NextResponse.json({ received: true, duplicate: true });

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await db
          .update(subscription)
          .set({
            stripeSubscriptionId: sub.id,
            status: sub.status,
            priceId: sub.items.data[0]?.price.id ?? null,
            currentPeriodEnd: new Date(sub.current_period_end * 1000),
            cancelAtPeriodEnd: sub.cancel_at_period_end,
            updatedAt: new Date(),
          })
          .where(eq(subscription.stripeCustomerId, sub.customer as string));
        break;
      }
      default:
        // Non-subscription events are logged but not acted on.
        break;
    }

    await db.insert(stripeEvent).values({
      id: event.id,
      type: event.type,
      payload: event as unknown as Record<string, unknown>,
    });

    return NextResponse.json({ received: true });
  } catch (e) {
    return new NextResponse(`handler error: ${(e as Error).message}`, { status: 500 });
  }
}
