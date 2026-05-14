import { NextRequest } from "next/server";
import { db } from "@/db";
import { canaryBillingAccount, canaryBillingEvent } from "@/db/schema";
import { desc } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { account_email, company_name, plan = "free" } = body;

    if (!account_email || !company_name) {
      return Response.json(
        { ok: false, error: { code: "VALIDATION_ERROR", message: "account_email and company_name are required" } },
        { status: 400 }
      );
    }

    const hasStripe = !!process.env.STRIPE_SECRET_KEY;

    const [created] = await db
      .insert(canaryBillingAccount)
      .values({
        accountEmail: account_email,
        companyName: company_name,
        plan,
        billingStatus: hasStripe ? "pending" : "payment_ready",
        paymentReady: !hasStripe,
        seats: 1,
      })
      .returning();

    // Record creation event
    await db.insert(canaryBillingEvent).values({
      accountId: created.id,
      eventType: "account_created",
      plan,
      seats: 1,
      status: "completed",
      metadata: { source: "api", stripeMode: hasStripe ? "live" : "fallback" },
    });

    return Response.json(
      { ok: true, account: { id: created.id, account_email: created.accountEmail, company_name: created.companyName, plan: created.plan, billing_status: created.billingStatus, payment_ready: created.paymentReady, created_at: created.createdAt } },
      { status: 201 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(JSON.stringify({ level: "error", route: "POST /api/canary-billing-accounts", error: message }));
    return Response.json(
      { ok: false, error: { code: "INTERNAL_ERROR", message } },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const accounts = await db
      .select()
      .from(canaryBillingAccount)
      .orderBy(desc(canaryBillingAccount.createdAt))
      .limit(50);

    return Response.json({ ok: true, accounts, total: accounts.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(JSON.stringify({ level: "error", route: "GET /api/canary-billing-accounts", error: message }));
    return Response.json(
      { ok: false, error: { code: "INTERNAL_ERROR", message } },
      { status: 500 }
    );
  }
}
