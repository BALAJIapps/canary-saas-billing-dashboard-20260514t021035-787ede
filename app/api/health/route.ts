import { db } from "@/db";
import { sql } from "drizzle-orm";

export async function GET() {
  const checks: Record<string, string> = {};

  // DB check
  try {
    await db.execute(sql`SELECT 1`);
    checks.db = "ok";
  } catch (e) {
    checks.db = "error";
  }

  // Stripe check (optional — only if key is configured)
  if (process.env.STRIPE_SECRET_KEY) {
    checks.stripe = "configured";
  } else {
    checks.stripe = "not_configured_fallback_mode";
  }

  const allOk = checks.db === "ok";

  return Response.json(
    { ok: allOk, checks },
    { status: allOk ? 200 : 503 }
  );
}
