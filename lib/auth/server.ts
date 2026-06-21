import { createNeonAuth } from "@neondatabase/auth/next/server";
import { notFound } from "next/navigation";
import { cache } from "react";

export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL!,
  cookies: {
    secret: process.env.NEON_AUTH_COOKIE_SECRET!,
  },
});

/**
 * Per-request-memoized session read. The root layout and the page both resolve
 * the current user during a single render; wrapping the read in React `cache()`
 * collapses those into one `auth.getSession()` (one cookie decode / refresh) for
 * the whole request instead of one per caller.
 */
const getSession = cache(() => auth.getSession());

/**
 * True if the signed-in account carries the Better Auth admin role.
 * `role` is an admin-plugin field on the Neon Auth user record; it is not
 * surfaced on the base session-user type, so we read it through a narrow
 * structural type rather than asserting the whole user shape.
 */
function isAdminUser(user: { role?: unknown } | null | undefined): boolean {
  return user?.role === "admin";
}

/** Returns the signed-in admin email, or null if not authenticated / not an admin. */
export async function getAdminEmail(): Promise<string | null> {
  const { data } = await getSession();
  const user = data?.user;
  if (!user?.email) return null;
  return isAdminUser(user) ? user.email : null;
}

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  isAdmin: boolean;
};

/**
 * The signed-in user (or null if anonymous). Single source of truth for "who is
 * signed in" used by the root layout (nav) and the profile page. `isAdmin` is
 * derived from the Neon Auth user's `role` (set to "admin" via the Better Auth
 * admin plugin); any signed-in account whose role is not "admin" is a normal user.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const { data } = await getSession();
  const user = data?.user;
  if (!user?.email) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    isAdmin: isAdminUser(user),
  };
}

/**
 * For server components/pages: return a 404 if not an admin, so the route's
 * existence is not revealed to unauthorized visitors.
 */
export async function requireAdmin(): Promise<string> {
  const email = await getAdminEmail();
  if (!email) notFound();
  return email;
}

/** For server actions: throw if not an admin. */
export async function assertAdmin(): Promise<void> {
  if (!(await getAdminEmail())) throw new Error("Unauthorized");
}

/**
 * For server components/pages that require *any* signed-in account (the personal
 * collection surfaces): return the user or 404 if anonymous. Admins count as
 * signed-in users — a stamp book / favorites list is personal regardless of role.
 */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) notFound();
  return user;
}

/** For server actions: throw if not signed in; returns the signed-in user id. */
export async function assertUser(): Promise<string> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  return user.id;
}
