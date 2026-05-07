"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { subscription as subscriptionTable } from "@/db/schema";
import { stripe, priceId } from "@/lib/stripe";
import { requireSession } from "@/lib/session";

export async function startCheckout() {
  const session = await requireSession();

  const existing = await db.query.subscription.findFirst({
    where: eq(subscriptionTable.userId, session.user.id),
  });

  let customerId = existing?.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: session.user.email,
      metadata: { userId: session.user.id },
    });
    customerId = customer.id;
    await db
      .insert(subscriptionTable)
      .values({
        userId: session.user.id,
        stripeCustomerId: customerId,
        status: "inactive",
      })
      .onConflictDoNothing();
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const checkout = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId(), quantity: 1 }],
    success_url: `${appUrl}/app?checkout=success`,
    cancel_url: `${appUrl}/app?checkout=cancelled`,
    allow_promotion_codes: true,
  });

  if (!checkout.url) throw new Error("stripe did not return a checkout URL");
  redirect(checkout.url);
}
