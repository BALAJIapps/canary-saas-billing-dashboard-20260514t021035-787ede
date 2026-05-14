"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, CreditCard, CheckCircle, AlertCircle } from "lucide-react";

const PLANS = ["free", "starter", "pro", "enterprise"] as const;
type Plan = (typeof PLANS)[number];

export default function BillingAccountForm() {
  const [form, setForm] = useState({ account_email: "", company_name: "", plan: "pro" as Plan });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string; accountId?: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/canary-billing-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.ok) {
        setResult({ ok: true, message: `Account created for ${data.account.company_name}`, accountId: data.account.id });
        setForm({ account_email: "", company_name: "", plan: "pro" });
      } else {
        setResult({ ok: false, message: data.error?.message ?? "Failed to create account" });
      }
    } catch {
      setResult({ ok: false, message: "Network error. Please try again." });
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckout() {
    if (!result?.accountId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/canary-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account_id: result.accountId, plan: form.plan, seats: 1 }),
      });
      const data = await res.json();
      if (data.ok && data.checkout.checkout_url) {
        window.location.href = data.checkout.checkout_url;
      } else {
        setResult({ ok: true, message: `Payment ready — ${data.checkout?.status ?? "pending"}`, accountId: result.accountId });
      }
    } catch {
      setResult({ ok: false, message: "Checkout error. Please try again." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card style={{ border: "1px solid #e5edf5", borderRadius: "6px", boxShadow: "rgba(23,23,23,0.08) 0px 15px 35px 0px" }}>
      <CardHeader style={{ borderBottom: "1px solid #e5edf5", paddingBottom: "0.875rem" }}>
        <CardTitle style={{ color: "#061b31", fontSize: "0.9375rem", fontWeight: 500, letterSpacing: "-0.02em" }}>Create Billing Account</CardTitle>
        <CardDescription style={{ color: "#64748d", fontSize: "0.8125rem" }}>Set up a new account with a subscription plan</CardDescription>
      </CardHeader>
      <CardContent className="pt-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="company_name" style={{ color: "#273951", fontSize: "0.8125rem", fontWeight: 500 }}>Company name</Label>
            <Input
              id="company_name"
              placeholder="Acme Corp"
              value={form.company_name}
              onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))}
              required
              style={{ borderColor: "#e5edf5", borderRadius: "4px", fontSize: "0.875rem", color: "#061b31" }}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="account_email" style={{ color: "#273951", fontSize: "0.8125rem", fontWeight: 500 }}>Billing email</Label>
            <Input
              id="account_email"
              type="email"
              placeholder="billing@acme.com"
              value={form.account_email}
              onChange={(e) => setForm((f) => ({ ...f, account_email: e.target.value }))}
              required
              style={{ borderColor: "#e5edf5", borderRadius: "4px", fontSize: "0.875rem", color: "#061b31" }}
            />
          </div>
          <div className="space-y-1.5">
            <Label style={{ color: "#273951", fontSize: "0.8125rem", fontWeight: 500 }}>Subscription plan</Label>
            <div className="flex gap-2 flex-wrap">
              {PLANS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, plan: p }))}
                  style={{
                    padding: "4px 12px",
                    borderRadius: "4px",
                    fontSize: "0.8125rem",
                    fontWeight: form.plan === p ? 500 : 400,
                    border: form.plan === p ? "1px solid #533afd" : "1px solid #e5edf5",
                    backgroundColor: form.plan === p ? "rgba(83,58,253,0.06)" : "transparent",
                    color: form.plan === p ? "#533afd" : "#64748d",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {result && (
            <div
              style={{
                padding: "10px 12px",
                borderRadius: "4px",
                backgroundColor: result.ok ? "rgba(21,190,83,0.08)" : "rgba(234,34,97,0.06)",
                border: result.ok ? "1px solid rgba(21,190,83,0.3)" : "1px solid rgba(234,34,97,0.2)",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              {result.ok ? (
                <CheckCircle className="h-4 w-4 flex-shrink-0" style={{ color: "#108c3d" }} />
              ) : (
                <AlertCircle className="h-4 w-4 flex-shrink-0" style={{ color: "#ea2261" }} />
              )}
              <span style={{ fontSize: "0.8125rem", color: result.ok ? "#108c3d" : "#ea2261" }}>{result.message}</span>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button
              type="submit"
              disabled={loading}
              className="flex-1"
              style={{ backgroundColor: "#533afd", color: "#ffffff", borderRadius: "4px", fontSize: "0.875rem", fontWeight: 400 }}
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              {loading ? "Creating..." : "Create Account"}
            </Button>
            {result?.accountId && (
              <Button
                type="button"
                onClick={handleCheckout}
                disabled={loading}
                variant="outline"
                style={{ borderColor: "#b9b9f9", color: "#533afd", borderRadius: "4px", fontSize: "0.875rem", fontWeight: 400 }}
              >
                <CreditCard className="h-3.5 w-3.5 mr-1.5" />
                Checkout
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
