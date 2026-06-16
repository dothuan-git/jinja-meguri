import { NextResponse, type NextRequest } from "next/server";

// Neon Auth stores the long-lived credential here; the short-lived `session_data`
// cache cookie (5-min TTL) is what RSC `getSession()` reads.
const SESSION_TOKEN_COOKIE = "__Secure-neon-auth.session_token";

/**
 * Refreshes the Neon Auth session cookie outside of render.
 *
 * `auth.getSession()` mints a fresh `session_data` cookie on a cache miss. Doing
 * that inside a Server Component render throws ("Cookies can only be modified in
 * a Server Action or Route Handler"). Middleware is allowed to write cookies, so
 * we trigger the refresh here by delegating to the auth route handler and copying
 * any resulting Set-Cookie headers onto the response. The RSC then only ever reads
 * the (now fresh) cache.
 *
 * This intentionally does NOT protect routes — authorization stays in
 * `requireAdmin()` (404s unauthorized visitors) so the admin area's existence is
 * not revealed, and the public login form at `/admin` remains reachable.
 */
export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Anonymous visitors (login page) have no token to refresh — skip the upstream call.
  if (!request.cookies.has(SESSION_TOKEN_COOKIE)) return response;

  try {
    const refreshed = await fetch(new URL("/api/auth/get-session", request.url), {
      headers: { cookie: request.headers.get("cookie") ?? "" },
    });
    for (const cookie of refreshed.headers.getSetCookie()) {
      response.headers.append("set-cookie", cookie);
    }
  } catch {
    // A refresh failure must never break navigation; the RSC falls back to its
    // own getSession() (which may still serve a valid cached session).
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
