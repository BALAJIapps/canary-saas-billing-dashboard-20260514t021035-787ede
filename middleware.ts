import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * Edge-fast auth gate. Only checks for the presence of the session cookie —
 * actual session validation still happens in the layout via `getSession()`,
 * which is tamper-proof. This middleware only avoids an expensive SSR render
 * for obviously-unauthenticated requests.
 */
export function middleware(request: NextRequest) {
  const cookie = getSessionCookie(request);
  if (!cookie) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    url.searchParams.set("from", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*"],
};
