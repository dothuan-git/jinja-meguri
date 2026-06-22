import { NextResponse, type NextRequest } from "next/server";

// Neon Auth stores the long-lived credential here; the short-lived `session_data`
// cache cookie (5-min TTL) is what RSC `getSession()` reads.
const SESSION_TOKEN_COOKIE = "__Secure-neon-auth.session_token";

// OAuth (social) sign-in redirects back to the app with this query param. It must
// be exchanged — together with the `session_challange` cookie set when the flow
// started — for a real session cookie, or the user lands signed-out despite a
// successful provider login. (Names mirror @neondatabase/auth internals.)
const OAUTH_VERIFIER_PARAM = "neon_auth_session_verifier";

/** Forwards a get-session request to the auth proxy and returns its Set-Cookie headers. */
async function fetchSessionCookies(request: NextRequest, search?: string): Promise<string[]> {
  const url = new URL("/api/auth/get-session", request.url);
  if (search) url.search = search;
  const res = await fetch(url, { headers: { cookie: request.headers.get("cookie") ?? "" } });
  return res.headers.getSetCookie();
}

/**
 * Refreshes the Neon Auth session cookie outside of render, and completes the
 * OAuth handshake on social-login returns.
 *
 * `auth.getSession()` mints a fresh `session_data` cookie on a cache miss. Doing
 * that inside a Server Component render throws ("Cookies can only be modified in
 * a Server Action or Route Handler"). Middleware is allowed to write cookies, so
 * we trigger the refresh here by delegating to the auth route handler and copying
 * any resulting Set-Cookie headers onto the response. The RSC then only ever reads
 * the (now fresh) cache.
 *
 * For social login, Neon Auth bounces the browser back with a one-time
 * `neon_auth_session_verifier` query param instead of a session cookie. We forward
 * that param (the proxy preserves the query string upstream) so the auth backend
 * exchanges it for the real `session_token`/`session_data` cookies, then redirect
 * to the verifier-stripped URL so the next render is signed in. Without this step
 * the verifier is never redeemed and OAuth users stay logged out.
 *
 * This intentionally does NOT protect routes — authorization stays in
 * `requireAdmin()` (404s unauthorized visitors) so the admin surfaces' existence
 * is not revealed.
 *
 * The matcher covers all page routes (excluding `/api`, `/_next`, and static
 * assets) because the root layout and pages now read the session at render time
 * via `getCurrentUser()` — that read must hit an already-fresh cache.
 */
export async function middleware(request: NextRequest) {
  const verifier = request.nextUrl.searchParams.get(OAUTH_VERIFIER_PARAM);

  // OAuth return: redeem the verifier for a session, then redirect to the clean URL.
  if (verifier) {
    const cleanUrl = new URL(request.nextUrl);
    cleanUrl.searchParams.delete(OAUTH_VERIFIER_PARAM);
    const redirect = NextResponse.redirect(cleanUrl);
    try {
      const search = `?${OAUTH_VERIFIER_PARAM}=${encodeURIComponent(verifier)}`;
      for (const cookie of await fetchSessionCookies(request, search)) {
        redirect.headers.append("set-cookie", cookie);
      }
    } catch {
      // Exchange failure must not trap the user on the verifier URL; redirect anyway.
    }
    return redirect;
  }

  const response = NextResponse.next();

  // Anonymous visitors (login page) have no token to refresh — skip the upstream call.
  if (!request.cookies.has(SESSION_TOKEN_COOKIE)) return response;

  try {
    for (const cookie of await fetchSessionCookies(request)) {
      response.headers.append("set-cookie", cookie);
    }
  } catch {
    // A refresh failure must never break navigation; the RSC falls back to its
    // own getSession() (which may still serve a valid cached session).
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?|ttf|map)$).*)",
  ],
};
