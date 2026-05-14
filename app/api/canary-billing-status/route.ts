import { db } from "@/db";
import { canaryBillingAccount, canaryBillingEvent } from "@/db/schema";
import { desc, sql } from "drizzle-orm";

export async function GET() {
  try {
    // Use raw SQL via tagged template — rows comes back as an array
    const statsRows = await db.execute(
      sql`SELECT
        COUNT(*) AS total_accounts,
        COUNT(*) FILTER (WHERE billing_status = 'active') AS active_accounts,
        COUNT(*) FILTER (WHERE billing_status = 'payment_ready') AS payment_ready_accounts,
        COUNT(*) FILTER (WHERE payment_ready = true) AS payment_ready_count,
        COUNT(*) FILTER (WHERE plan = 'pro') AS pro_accounts,
        COUNT(*) FILTER (WHERE plan = 'enterprise') AS enterprise_accounts,
        COUNT(*) FILTER (WHERE plan = 'starter') AS starter_accounts
      FROM canary_billing_accounts`
    );

    const eventRows = await db.execute(
      sql`SELECT COUNT(*) AS total_events,
        COUNT(*) FILTER (WHERE event_type = 'checkout_initiated') AS checkout_events,
        COUNT(*) FILTER (WHERE event_type = 'account_created') AS creation_events
      FROM canary_billing_events`
    );

    const recentAccounts = await db
      .select()
      .from(canaryBillingAccount)
      .orderBy(desc(canaryBillingAccount.createdAt))
      .limit(10);

    // Drizzle's execute returns an object with a `rows` array (neon http driver)
    // or directly an array — handle both shapes safely
    const statsArr = Array.isArray(statsRows) ? statsRows : (statsRows as { rows: Record<string, unknown>[] }).rows ?? [];
    const eventArr = Array.isArray(eventRows) ? eventRows : (eventRows as { rows: Record<string, unknown>[] }).rows ?? [];

    const stats = (statsArr[0] ?? {}) as Record<string, unknown>;
    const eventStats = (eventArr[0] ?? {}) as Record<string, unknown>;

    const hasStripe = !!process.env.STRIPE_SECRET_KEY;

    return Response.json({
      ok: true,
      billing_status: {
        stripe_mode: hasStripe ? "live" : "fallback",
        payment_ready: !hasStripe ? true : undefined,
        total_accounts: Number(stats.total_accounts ?? 0),
        active_accounts: Number(stats.active_accounts ?? 0),
        payment_ready_accounts:
          Number(stats.payment_ready_accounts ?? 0) +
          Number(stats.payment_ready_count ?? 0),
        pro_accounts: Number(stats.pro_accounts ?? 0),
        enterprise_accounts: Number(stats.enterprise_accounts ?? 0),
        starter_accounts: Number(stats.starter_accounts ?? 0),
        total_events: Number(eventStats.total_events ?? 0),
        checkout_events: Number(eventStats.checkout_events ?? 0),
        creation_events: Number(eventStats.creation_events ?? 0),
      },
      recent_accounts: recentAccounts.map((a) => ({
        id: a.id,
        company_name: a.companyName,
        plan: a.plan,
        billing_status: a.billingStatus,
        payment_ready: a.paymentReady,
        seats: a.seats,
        created_at: a.createdAt,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(
      JSON.stringify({ level: "error", route: "GET /api/canary-billing-status", error: message })
    );
    return Response.json(
      { ok: false, error: { code: "INTERNAL_ERROR", message: "Internal server error" } },
      { status: 500 }
    );
  }
}
