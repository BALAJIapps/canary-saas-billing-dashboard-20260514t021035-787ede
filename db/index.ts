/**
 * Database client.
 *
 * Uses the node-postgres (`pg`) driver via `drizzle-orm/node-postgres`.
 *
 * Why not `drizzle-orm/neon-http`? The HTTP driver is faster cold-start
 * but does NOT honor connection-string options like `?options=-csearch_path=app_xxx`,
 * which Baljia's docker-provisioner uses for schema-per-app isolation
 * on the shared Neon control plane database. The classic libpq-style `pg`
 * driver respects them and works against any Postgres (not just Neon).
 */
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Neon requires SSL. Most managed Postgres providers do too. The
  // connection string already includes sslmode=require for Neon, but
  // we set it explicitly to fail fast on misconfigured envs.
  ssl: process.env.DATABASE_URL.includes("sslmode=require")
    ? { rejectUnauthorized: false }
    : false,
});

export const db = drizzle(pool, { schema });

export type DB = typeof db;
