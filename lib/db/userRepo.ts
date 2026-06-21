import "server-only";
import { pool } from "@/lib/db/store";
import { getShrineCards } from "@/lib/db/repo";
import type { Store, UserMark, MarkState, UserCollections, StampEntry, SavedEntry } from "@/lib/types";

/**
 * Per-user collection rows for one account, joined to each shrine's slug.
 *
 * This is the **non-cached** read path: unlike `loadStore()` (a global Store
 * shared across all visitors in the Next Data Cache), user marks are personal,
 * so they are read fresh from Neon on every request via the shared `pool`. The
 * pages that call this are already `force-dynamic`. Indexed by `user_id`.
 */
export async function loadUserMarks(userId: string): Promise<UserMark[]> {
  const { rows } = await pool.query(
    `SELECT s.slug,
            m.saved_at::text   AS saved_at,
            m.stamped_at::text AS stamped_at
       FROM user_shrine_marks m
       JOIN shrines s ON s.id = m.shrine_id
      WHERE m.user_id = $1`,
    [userId],
  );
  return rows as UserMark[];
}

/** Pure: the mark state for a single shrine slug from a loaded mark list. */
export function getMarkState(marks: UserMark[], slug: string): MarkState {
  const m = marks.find((row) => row.slug === slug);
  return { saved: Boolean(m?.saved_at), stamped: Boolean(m?.stamped_at) };
}

/** Pure: the set of slugs the user has favorited. */
export function savedSlugs(marks: UserMark[]): string[] {
  return marks.filter((m) => m.saved_at).map((m) => m.slug);
}

/** Pure: the set of slugs the user has collected a goshuin for. */
export function stampedSlugs(marks: UserMark[]): string[] {
  return marks.filter((m) => m.stamped_at).map((m) => m.slug);
}

/**
 * Pure: join the user's marks against the cached Store's shrine cards to build
 * the profile dashboard collections, newest first. Marks whose shrine no longer
 * exists (deleted) are dropped — the JOIN in `loadUserMarks` already excludes
 * them, but this is also resilient to a stale card index.
 */
export function getUserCollections(store: Store, marks: UserMark[]): UserCollections {
  const cardBySlug = new Map(getShrineCards(store).map((c) => [c.slug, c]));

  const stamped: StampEntry[] = marks
    .filter((m) => m.stamped_at && cardBySlug.has(m.slug))
    .sort((a, b) => (b.stamped_at! > a.stamped_at! ? 1 : -1))
    .map((m) => ({ ...cardBySlug.get(m.slug)!, stamped_at: m.stamped_at! }));

  const saved: SavedEntry[] = marks
    .filter((m) => m.saved_at && cardBySlug.has(m.slug))
    .sort((a, b) => (b.saved_at! > a.saved_at! ? 1 : -1))
    .map((m) => ({ ...cardBySlug.get(m.slug)!, saved_at: m.saved_at! }));

  return { stamped, saved };
}
