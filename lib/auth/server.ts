import { createNeonAuth } from "@neondatabase/auth/next/server";
import { notFound } from "next/navigation";
import { pool } from "@/lib/db/store";

export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL!,
  cookies: {
    secret: process.env.NEON_AUTH_COOKIE_SECRET!,
  },
});

/** True if the email has an admin row in the app_admin allowlist table (case-insensitive). */
async function isAllowedAdmin(email: string | null | undefined): Promise<boolean> {
  if (!email) return false;
  const { rowCount } = await pool.query(
    "SELECT 1 FROM app_admin WHERE lower(email) = lower($1) LIMIT 1",
    [email],
  );
  return (rowCount ?? 0) > 0;
}

/** Returns the signed-in admin email, or null if not authenticated / not on the allowlist. */
async function getAdminEmail(): Promise<string | null> {
  const { data } = await auth.getSession();
  const email = data?.user?.email;
  if (!email) return null;
  return (await isAllowedAdmin(email)) ? email : null;
}

/**
 * For server components/pages: return a 404 if not an admin, so the route's
 * existence is not revealed to unauthorized visitors. Admins reach the login
 * form directly at /admin.
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
