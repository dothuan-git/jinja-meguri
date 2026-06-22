import "server-only";
import { pool } from "@/lib/db/store";
import type { MarkState } from "@/lib/types";

/**
 * Per-user collection writes. Each toggles one timestamp column on the
 * `(user_id, shrine_id)` row, resolving the shrine by slug in a single
 * round-trip. When both timestamps end up null the row is deleted (an empty
 * mark carries no meaning). Returns the resulting MarkState for optimistic UI.
 *
 * These do NOT touch the global Store cache (STORE_TAG) — user marks live on the
 * non-cached read path and the pages that read them are `force-dynamic`.
 */

type Column = "saved_at" | "stamped_at";

async function setMark(userId: string, slug: string, column: Column, on: boolean): Promise<MarkState> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const shrine = await client.query("SELECT id FROM shrines WHERE slug = $1", [slug]);
    const shrineId = shrine.rows[0]?.id as string | undefined;
    if (!shrineId) throw new Error(`Unknown shrine slug: "${slug}"`);

    if (on) {
      // Upsert: set this column to now(), preserve the other.
      await client.query(
        `INSERT INTO user_shrine_marks (user_id, shrine_id, ${column})
           VALUES ($1, $2, now())
         ON CONFLICT (user_id, shrine_id)
           DO UPDATE SET ${column} = now()`,
        [userId, shrineId],
      );
    } else {
      // Clear this column; delete the row if the other column is also null.
      await client.query(
        `UPDATE user_shrine_marks SET ${column} = NULL
          WHERE user_id = $1 AND shrine_id = $2`,
        [userId, shrineId],
      );
      await client.query(
        `DELETE FROM user_shrine_marks
          WHERE user_id = $1 AND shrine_id = $2
            AND saved_at IS NULL AND stamped_at IS NULL`,
        [userId, shrineId],
      );
    }

    const res = await client.query(
      "SELECT saved_at, stamped_at FROM user_shrine_marks WHERE user_id = $1 AND shrine_id = $2",
      [userId, shrineId],
    );
    await client.query("COMMIT");

    const row = res.rows[0];
    return { saved: Boolean(row?.saved_at), stamped: Boolean(row?.stamped_at) };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export function setSaved(userId: string, slug: string, saved: boolean): Promise<MarkState> {
  return setMark(userId, slug, "saved_at", saved);
}

export function setStamped(userId: string, slug: string, stamped: boolean): Promise<MarkState> {
  return setMark(userId, slug, "stamped_at", stamped);
}

/**
 * Persist the account's chosen kamon crest (upsert one `user_profile` row). The
 * caller (server action) validates `crest` against CREST_IDS. Like the mark
 * writes, this does NOT touch the cached Store — `user_profile` is non-cached.
 */
export async function setCrest(userId: string, crest: string): Promise<void> {
  await pool.query(
    `INSERT INTO user_profile (user_id, crest) VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET crest = EXCLUDED.crest`,
    [userId, crest],
  );
}
