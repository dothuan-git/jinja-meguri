"use server";

import { assertUser } from "@/lib/auth/server";
import { setSaved, setStamped } from "@/lib/db/userMutations";
import type { MarkState } from "@/lib/types";

// Slugs are lowercase letters, digits and hyphens (matches the shrine contract).
const SLUG_RE = /^[a-z0-9-]+$/;

type Result = { state?: MarkState; error?: string };

/** Toggle "favorited / want to visit" for a shrine. No STORE_TAG revalidation. */
export async function toggleSaveAction(slug: string, saved: boolean): Promise<Result> {
  const userId = await assertUser();
  if (!SLUG_RE.test(slug)) return { error: "Invalid shrine" };
  try {
    return { state: await setSaved(userId, slug, saved) };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Database error" };
  }
}

/** Toggle the goshuin stamp ("collected / visited") for a shrine. */
export async function toggleStampAction(slug: string, stamped: boolean): Promise<Result> {
  const userId = await assertUser();
  if (!SLUG_RE.test(slug)) return { error: "Invalid shrine" };
  try {
    return { state: await setStamped(userId, slug, stamped) };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Database error" };
  }
}
