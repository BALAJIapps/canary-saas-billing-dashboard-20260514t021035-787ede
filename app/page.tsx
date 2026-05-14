import { db } from "@/db";
import { canaryBillingAccount, canaryBillingEvent } from "@/db/schema";
import { desc, sql } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreditCard, Users, TrendingUp, CheckCircle, AlertCircle, Zap, BarChart3 } from "lucide-react";
import BillingAccountForm from "@/components/billing-account-form";

async function getBillingStats() {
  try {
    const statsRows = await db.execute(
      sql`SELECT
        COUNT(*) AS total_accounts,
        COUNT(*) FILTER (WHERE billing_status = 'active') AS active_accounts,
        COUNT(*) FILTER (WHERE payment_ready = true) AS payment_ready_count,
        COUNT(*) FILTER (WHERE plan = 'pro') AS pro_accounts,
        COUNT(*) FILTER (WHERE plan = 'enterprise') AS enterprise_accounts
      FROM canary_billing_accounts`
    );
    const eventsRows = await db.execute(
      sql`SELECT COUNT(*) AS total_events FROM canary_billing_events`
    );

    const statsArr = Array.isArray(statsRows) ? statsRows : (statsRows as { rows: Record<string, unknown>[] }).rows ?? [];
    const eventArr = Array.isArray(eventsRows) ? eventsRows : (eventsRows as { rows: Record<string, unknown>[] }).rows ?? [];

    const stats = (statsArr[0] ?? {}) as Record<string, unknown>;
    const eventStats = (eventArr[0] ?? {}) as Record<string, unknown>;

    return {
      totalAccounts: Number(stats.total_accounts ?? 0),
      activeAccounts: Number(stats.active_accounts ?? 0),
      paymentReadyCount: Number(stats.payment_ready_count ?? 0),
      proAccounts: Number(stats.pro_accounts ?? 0),
      enterpriseAccounts: Number(stats.enterprise_accounts ?? 0),
      totalEvents: Number(eventStats.total_events ?? 0),
    };
  } catch {
    return { totalAccounts: 0, activeAccounts: 0, paymentReadyCount: 0, proAccounts: 0, enterpriseAccounts: 0, totalEvents: 0 };
  }
}

async function getRecentAccounts() {
  try {
    return await db
      .select()
      .from(canaryBillingAccount)
      .orderBy(desc(canaryBillingAccount.createdAt))
      .limit(8);
  } catch {
    return [];
  }
}

function StatusBadge({ status }: { status: string }) {
  if (status === "active") return <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 rounded">Active</Badge>;
  if (status === "payment_ready") return <Badge className="bg-blue-50 text-blue-700 border border-blue-200 rounded">Payment Ready</Badge>;
  if (status === "checkout_initiated") return <Badge className="bg-amber-50 text-amber-700 border border-amber-200 rounded">Checkout</Badge>;
  return <Badge variant="outline" className="rounded">{status}</Badge>;
}

function PlanBadge({ plan }: { plan: string }) {
  const colors: Record<string, string> = {
    enterprise: "bg-violet-50 text-violet-700 border-violet-200",
    pro: "bg-blue-50 text-blue-700 border-blue-200",
    starter: "bg-slate-50 text-slate-600 border-slate-200",
    free: "bg-gray-50 text-gray-500 border-gray-200",
  };
  return <Badge className={`border rounded text-xs ${colors[plan] ?? colors.free}`}>{plan.charAt(0).toUpperCase() + plan.slice(1)}</Badge>;
}

export default async function HomePage() {
  const [stats, recentAccounts] = await Promise.all([getBillingStats(), getRecentAccounts()]);
  const hasStripe = !!process.env.STRIPE_SECRET_KEY;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#ffffff", fontFamily: "'SF Pro Display', system-ui, sans-serif" }}>
      {/* Nav */}
      <nav style={{ borderBottom: "1px solid #e5edf5", backgroundColor: "rgba(255,255,255,0.95)", backdropFilter: "blur(12px)" }} className="sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div style={{ backgroundColor: "#533afd", borderRadius: "6px" }} className="p-1.5">
              <CreditCard className="h-5 w-5 text-white" />
            </div>
            <span style={{ color: "#061b31", fontWeight: 600, fontSize: "1rem", letterSpacing: "-0.02em" }}>BillFlow</span>
          </div>
          <div className="flex items-center gap-3">
            {!hasStripe && (
              <Badge style={{ backgroundColor: "rgba(83,58,253,0.08)", color: "#533afd", border: "1px solid rgba(83,58,253,0.2)", borderRadius: "4px", fontSize: "0.75rem" }}>
                Fallback Mode
              </Badge>
            )}
            <Button size="sm" style={{ backgroundColor: "#533afd", color: "#ffffff", borderRadius: "4px", fontSize: "0.875rem", fontWeight: 400 }}>
              <Zap className="h-3.5 w-3.5 mr-1.5" />
              Upgrade Plan
            </Button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-10">
          <h1 style={{ color: "#061b31", fontSize: "2.25rem", fontWeight: 300, letterSpacing: "-0.64px", lineHeight: 1.15 }}>
            Billing Dashboard
          </h1>
          <p style={{ color: "#64748d", fontSize: "1rem", fontWeight: 300, marginTop: "0.5rem" }}>
            Manage accounts, subscriptions, and billing status across your organization.
          </p>
        </div>

        {/* Stripe mode banner */}
        {!hasStripe && (
          <div style={{ backgroundColor: "rgba(83,58,253,0.05)", border: "1px solid rgba(83,58,253,0.15)", borderRadius: "6px" }} className="p-4 mb-8 flex items-start gap-3">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: "#533afd" }} />
            <div>
              <p style={{ color: "#061b31", fontSize: "0.875rem", fontWeight: 500 }}>Payment-Ready Mode</p>
              <p style={{ color: "#64748d", fontSize: "0.8125rem", marginTop: "0.125rem" }}>
                Stripe credentials are not configured. Accounts are persisted with <code style={{ backgroundColor: "rgba(83,58,253,0.08)", padding: "0 4px", borderRadius: "3px", fontSize: "0.75rem" }}>payment_ready=true</code> status.
              </p>
            </div>
          </div>
        )}

        {/* Metric cards */}
        <div className="grid md:grid-cols-4 gap-4 mb-10">
          <Card style={{ border: "1px solid #e5edf5", borderRadius: "6px", boxShadow: "rgba(50,50,93,0.25) 0px 6px 12px -2px, rgba(0,0,0,0.1) 0px 3px 7px -3px" }}>
            <CardContent className="pt-5">
              <div className="flex items-center justify-between mb-3">
                <span style={{ color: "#64748d", fontSize: "0.75rem", fontWeight: 400, textTransform: "uppercase", letterSpacing: "0.06em" }}>Total Accounts</span>
                <Users className="h-4 w-4" style={{ color: "#533afd" }} />
              </div>
              <div style={{ color: "#061b31", fontSize: "1.875rem", fontWeight: 300, letterSpacing: "-0.64px", fontVariantNumeric: "tabular-nums" }}>
                {stats.totalAccounts}
              </div>
            </CardContent>
          </Card>

          <Card style={{ border: "1px solid #e5edf5", borderRadius: "6px", boxShadow: "rgba(50,50,93,0.25) 0px 6px 12px -2px, rgba(0,0,0,0.1) 0px 3px 7px -3px" }}>
            <CardContent className="pt-5">
              <div className="flex items-center justify-between mb-3">
                <span style={{ color: "#64748d", fontSize: "0.75rem", fontWeight: 400, textTransform: "uppercase", letterSpacing: "0.06em" }}>Payment Ready</span>
                <CheckCircle className="h-4 w-4" style={{ color: "#15be53" }} />
              </div>
              <div style={{ color: "#061b31", fontSize: "1.875rem", fontWeight: 300, letterSpacing: "-0.64px", fontVariantNumeric: "tabular-nums" }}>
                {stats.paymentReadyCount}
              </div>
            </CardContent>
          </Card>

          <Card style={{ border: "1px solid #e5edf5", borderRadius: "6px", boxShadow: "rgba(50,50,93,0.25) 0px 6px 12px -2px, rgba(0,0,0,0.1) 0px 3px 7px -3px" }}>
            <CardContent className="pt-5">
              <div className="flex items-center justify-between mb-3">
                <span style={{ color: "#64748d", fontSize: "0.75rem", fontWeight: 400, textTransform: "uppercase", letterSpacing: "0.06em" }}>Pro Accounts</span>
                <TrendingUp className="h-4 w-4" style={{ color: "#533afd" }} />
              </div>
              <div style={{ color: "#061b31", fontSize: "1.875rem", fontWeight: 300, letterSpacing: "-0.64px", fontVariantNumeric: "tabular-nums" }}>
                {stats.proAccounts}
              </div>
            </CardContent>
          </Card>

          <Card style={{ border: "1px solid #e5edf5", borderRadius: "6px", boxShadow: "rgba(50,50,93,0.25) 0px 6px 12px -2px, rgba(0,0,0,0.1) 0px 3px 7px -3px" }}>
            <CardContent className="pt-5">
              <div className="flex items-center justify-between mb-3">
                <span style={{ color: "#64748d", fontSize: "0.75rem", fontWeight: 400, textTransform: "uppercase", letterSpacing: "0.06em" }}>Billing Events</span>
                <BarChart3 className="h-4 w-4" style={{ color: "#64748d" }} />
              </div>
              <div style={{ color: "#061b31", fontSize: "1.875rem", fontWeight: 300, letterSpacing: "-0.64px", fontVariantNumeric: "tabular-nums" }}>
                {stats.totalEvents}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Two-column layout: Form + Account table */}
        <div className="grid md:grid-cols-[1fr_1.6fr] gap-8 mb-12">
          {/* Create account form */}
          <div>
            <BillingAccountForm />
          </div>

          {/* Recent accounts table */}
          <Card style={{ border: "1px solid #e5edf5", borderRadius: "6px", boxShadow: "rgba(23,23,23,0.08) 0px 15px 35px 0px" }}>
            <CardHeader style={{ borderBottom: "1px solid #e5edf5", paddingBottom: "0.875rem" }}>
              <CardTitle style={{ color: "#061b31", fontSize: "0.9375rem", fontWeight: 500, letterSpacing: "-0.02em" }}>Recent Accounts</CardTitle>
              <CardDescription style={{ color: "#64748d", fontSize: "0.8125rem" }}>Latest billing accounts and their subscription status</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              {recentAccounts.length === 0 ? (
                <div className="py-10 text-center">
                  <Users className="h-8 w-8 mx-auto mb-3" style={{ color: "#e5edf5" }} />
                  <p style={{ color: "#64748d", fontSize: "0.875rem" }}>No billing accounts yet. Create one to get started.</p>
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: "#f0f4f8" }}>
                  {recentAccounts.map((acct) => (
                    <div key={acct.id} className="py-3 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p style={{ color: "#061b31", fontSize: "0.875rem", fontWeight: 500, letterSpacing: "-0.01em" }} className="truncate">
                          {acct.companyName}
                        </p>
                        <p style={{ color: "#64748d", fontSize: "0.75rem" }} className="truncate">{acct.accountEmail}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <PlanBadge plan={acct.plan} />
                        <StatusBadge status={acct.billingStatus} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Pricing plans section */}
        <div className="mb-12">
          <h2 style={{ color: "#061b31", fontSize: "1.5rem", fontWeight: 300, letterSpacing: "-0.48px", marginBottom: "0.375rem" }}>Subscription Plans</h2>
          <p style={{ color: "#64748d", fontSize: "0.875rem", marginBottom: "1.5rem" }}>Choose the plan that fits your team&apos;s needs.</p>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { name: "Starter", price: "$29", period: "/mo", desc: "For early-stage teams getting billing off the ground.", features: ["Up to 5 seats", "Basic reporting", "Email support"], plan: "starter", accent: false },
              { name: "Pro", price: "$99", period: "/mo", desc: "For growing teams that need full billing automation.", features: ["Unlimited seats", "Advanced analytics", "Priority support", "Webhook events"], plan: "pro", accent: true },
              { name: "Enterprise", price: "$299", period: "/mo", desc: "For organizations requiring SLA and custom integrations.", features: ["Custom seats", "Dedicated manager", "SLA guarantee", "SSO & audit logs"], plan: "enterprise", accent: false },
            ].map((tier) => (
              <Card
                key={tier.plan}
                style={{
                  border: tier.accent ? "1px solid #533afd" : "1px solid #e5edf5",
                  borderRadius: "6px",
                  boxShadow: tier.accent
                    ? "rgba(83,58,253,0.2) 0px 20px 40px -10px, rgba(0,0,0,0.1) 0px 10px 20px -10px"
                    : "rgba(50,50,93,0.25) 0px 6px 12px -2px, rgba(0,0,0,0.08) 0px 3px 7px -3px",
                  position: "relative",
                }}
              >
                {tier.accent && (
                  <div style={{ position: "absolute", top: "-10px", left: "50%", transform: "translateX(-50%)", backgroundColor: "#533afd", color: "#ffffff", fontSize: "0.6875rem", fontWeight: 500, padding: "2px 10px", borderRadius: "4px", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>MOST POPULAR</div>
                )}
                <CardHeader className="pb-3">
                  <CardTitle style={{ color: "#061b31", fontSize: "1rem", fontWeight: 500 }}>{tier.name}</CardTitle>
                  <div className="flex items-baseline gap-0.5">
                    <span style={{ color: "#061b31", fontSize: "1.75rem", fontWeight: 300, letterSpacing: "-0.64px" }}>{tier.price}</span>
                    <span style={{ color: "#64748d", fontSize: "0.875rem" }}>{tier.period}</span>
                  </div>
                  <CardDescription style={{ color: "#64748d", fontSize: "0.8125rem" }}>{tier.desc}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 mb-5">
                    {tier.features.map((f) => (
                      <li key={f} className="flex items-center gap-2">
                        <CheckCircle className="h-3.5 w-3.5 flex-shrink-0" style={{ color: tier.accent ? "#533afd" : "#15be53" }} />
                        <span style={{ color: "#273951", fontSize: "0.8125rem" }}>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full"
                    style={{
                      backgroundColor: tier.accent ? "#533afd" : "transparent",
                      color: tier.accent ? "#ffffff" : "#533afd",
                      border: tier.accent ? "none" : "1px solid #b9b9f9",
                      borderRadius: "4px",
                      fontSize: "0.875rem",
                      fontWeight: 400,
                    }}
                  >
                    {tier.accent ? "Subscribe now" : `Choose ${tier.name}`}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Billing status card */}
        <Card style={{ border: "1px solid #e5edf5", borderRadius: "6px", backgroundColor: "#f8fafc", boxShadow: "rgba(23,23,23,0.06) 0px 3px 6px" }}>
          <CardHeader>
            <CardTitle style={{ color: "#061b31", fontSize: "0.9375rem", fontWeight: 500 }}>Billing Status</CardTitle>
            <CardDescription style={{ color: "#64748d", fontSize: "0.8125rem" }}>Current system billing configuration and payment integration status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <p style={{ color: "#64748d", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.375rem" }}>Payment Integration</p>
                <div className="flex items-center gap-2">
                  {hasStripe ? (
                    <><CheckCircle className="h-4 w-4" style={{ color: "#15be53" }} /><span style={{ color: "#061b31", fontSize: "0.875rem" }}>Connected</span></>
                  ) : (
                    <><AlertCircle className="h-4 w-4" style={{ color: "#533afd" }} /><span style={{ color: "#061b31", fontSize: "0.875rem" }}>Fallback mode</span></>
                  )}
                </div>
              </div>
              <div>
                <p style={{ color: "#64748d", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.375rem" }}>Payment Processing</p>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" style={{ color: "#15be53" }} />
                  <span style={{ color: "#061b31", fontSize: "0.875rem" }}>Ready</span>
                </div>
              </div>
              <div>
                <p style={{ color: "#64748d", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.375rem" }}>Enterprise Accounts</p>
                <span style={{ color: "#061b31", fontSize: "1.25rem", fontWeight: 300, letterSpacing: "-0.3px", fontVariantNumeric: "tabular-nums" }}>
                  {stats.enterpriseAccounts}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
