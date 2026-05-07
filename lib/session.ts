import "server-only";

import { headers } from "next/headers";

import { auth } from "@/lib/auth";

/**
 * Server-side session helpers. Only import from Server Components and server
 * actions — `next/headers` blows up in Client Components.
 */
export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function requireSession() {
  const session = await getSession();
  if (!session) throw new Error("unauthorized");
  return session;
}
