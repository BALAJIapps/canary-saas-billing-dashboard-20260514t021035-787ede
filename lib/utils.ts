import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Class name merger — safe for both client and server components.
 *
 * Server-only session helpers live in `@/lib/session` instead, because
 * `next/headers` can only be imported from Server Components and server
 * actions, and client components transitively import this file via Shadcn.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
