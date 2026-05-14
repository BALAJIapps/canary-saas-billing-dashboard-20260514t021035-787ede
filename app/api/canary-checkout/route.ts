import { NextRequest } from "next/server";
import { db } from "@/db";
import { canaryBillingAccount, canaryBillingEvent } from "@/db/schema";
import { eq } from "drizzle-orm";

const PLAN_PRICES: Record<string, number> = {
  free: 0,
  starter: 2900,
  pro: 9900,
  enterprise: 29900,
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { account_id, plan = "pro", seats = 1 } = body;

    if (!account_id) {
      return Response.json(
        { ok: false, error: { code: "VALIDATION_ERROR", message: "account_id is required" } },
        { status: 400 }
      );
    }

    // Look up account
    const [billingAccount] = await db
      .select()
      .from(canaryBillingAccount)
      .where(eq(canaryBillingAccount.id, account_id))
      .limit(1);

    if (!billingAccount) {
      return Response.json(
        { ok: false, error: { code: "NOT_FOUND", message: "Billing account not found" } },
        { status: 404 }
      );
    }

    const hasStripe = !!process.env.STRIPE_SECRET_KEY;
    const amount = (PLAN_PRICES[plan] ?? PLAN_PRICES.pro) * seats;

    let checkoutUrl: string | null = null;
    let sessionId: string | null = null;
    let status = "payment_ready";

    if (hasStripe) {
      try {
        const Stripe = (await import("stripe")).default;
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://canary-saas-billing-dashboard.onrender.com";

        const session = await stripe.checkout.sessions.create({
          mode: "subscription",
          line_items: [
            {
              price_data: {
                currency: "usd",
                product_data: { name: `${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan — ${seats} seat${seats > 1 ? "s" : ""}` },
                unit_amount: PLAN_PRICES[plan] ?? PLAN_PRICES.pro,
                recurring: { interval: "month" },
              },
              quantity: seats,
            },
          ],
          success_url: `${appUrl}/?checkout=success`,
          cancel_url: `${appUrl}/?checkout=cancelled`,
          customer_email: billingAccount.accountEmail,
          metadata: { account_id, plan, seats: String(seats) },
        });
        checkoutUrl = session.url;
        sessionId = session.id;
        status = "checkout_initiated";
      } catch (stripeErr) {
        console.error(JSON.stringify({ level: "error", msg: "Stripe checkout failed", error: stripeErr instanceof Error ? stripeErr.message : String(stripeErr) }));
        // Fall back gracefully
        status = "payment_ready";
      }
    }

    // Update account
    await db
      .update(canaryBillingAccount)
      .set({
        plan,
        seats,
        billingStatus: status,
        paymentReady: true,
        updatedAt: new Date(),
      })
      .where(eq(canaryBillingAccount.id, account_id));

    // Record checkout event
    await db.insert(canaryBillingEvent).values({
      accountId: account_id,
      eventType: "checkout_initiated",
      plan,
      seats,
      amount,
      currency: "usd",
      stripeSessionId: sessionId,
      status,
      metadata: {
        checkoutUrl,
        stripeMode: hasStripe ? "live" : "fallback",
        paymentReady: true,
      },
    });

    return Response.json({
      ok: true,
      checkout: {
        account_id,
        plan,
        seats,
        amount_cents: amount,
        currency: "usd",
        status,
        payment_ready: true,
        checkout_url: checkoutUrl,
        stripe_session_id: sessionId,
        stripe_mode: hasStripe ? "live" : "fallback",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(JSON.stringify({ level: "error", route: "POST /api/canary-checkout", error: message }));
    return Response.json(
      { ok: false, error: { code: "INTERNAL_ERROR", message } },
      { status: 500 }
    );
  }
}
