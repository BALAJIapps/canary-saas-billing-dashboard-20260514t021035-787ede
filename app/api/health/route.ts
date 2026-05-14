import { db } from "@/db";
import { sql } from "drizzle-orm";

export async function GET() {
  const checks: Record<string, string> = {};

  // DB check
  try {
    await db.execute(sql`SELECT 1`);
    checks.db = "ok";
  } catch {
    checks.db = "error";
  }

  const allOk = checks.db === "ok";

  return Response.json(
    { ok: allOk, checks },
    { status: allOk ? 200 : 503 }
  );
}
