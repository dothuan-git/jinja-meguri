import "server-only";
import { pool } from "@/lib/db/store";
import type { ShrineInput } from "@/lib/admin/shrineContract";
import type { DeityInput } from "@/lib/admin/deityContract";
import type { OccurrenceImportTarget } from "@/lib/admin/occurrenceContract";
import type { PoolClient } from "pg";

// Resolve a catalog name to its numeric id; throws if not found.
async function resolveId(
  client: PoolClient,
  table: string,
  nameEn: string,
): Promise<number> {
  const res = await client.query(`SELECT id FROM ${table} WHERE name_en = $1`, [nameEn]);
  if (!res.rows[0]) throw new Error(`Unknown ${table} name: "${nameEn}"`);
  return res.rows[0].id as number;
}

// Fetch a small, static catalog's name_en → id map in one round-trip, so a shrine
// with N ranks/categories resolves them all from memory instead of N SELECTs.
async function catalogMap(client: PoolClient, table: string): Promise<Map<string, number>> {
  const res = await client.query(`SELECT id, name_en FROM ${table}`);
  return new Map(res.rows.map((r) => [r.name_en as string, r.id as number]));
}

// Insert all (shrine_id, <col>) junction rows in a single multi-row INSERT.
async function insertJunction(
  client: PoolClient,
  table: string,
  col: string,
  shrineId: string,
  ids: number[],
): Promise<void> {
  if (!ids.length) return;
  const values = ids.map((_, i) => `($1,$${i + 2})`).join(",");
  await client.query(`INSERT INTO ${table} (shrine_id,${col}) VALUES ${values}`, [shrineId, ...ids]);
}

// Upsert a deity by name_ja (the canonical dedup key).
// Returns the deity's uuid id.
async function resolveDeity(
  client: PoolClient,
  deity: ShrineInput["deities"][number],
): Promise<string> {
  const existing = await client.query("SELECT id FROM deities WHERE name_ja = $1", [deity.name_ja]);
  if (existing.rows[0]) return existing.rows[0].id as string;

  if (!deity.canonical) throw new Error(`Deity "${deity.name_ja}" is not in the DB and no canonical block was provided`);
  const { name_en, name_ja, deity_type, titles, canonical_lore } = deity.canonical;
  const ins = await client.query(
    "INSERT INTO deities (name_en, name_ja, deity_type, titles, canonical_lore, mythic_sphere) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id",
    [name_en, name_ja ?? deity.name_ja, deity_type, titles ?? null, canonical_lore ?? null, null],
  );
  return ins.rows[0].id as string;
}

// Idempotent upsert: if a shrine with the given slug exists, wipe its children
// (ON DELETE CASCADE covers shrine_deities, shrine_ranks, shrine_prayer_categories,
// shrine_details, festivals→festival_occurrences, sources) then re-insert everything.
// Deities themselves are NEVER deleted (they are global).
export async function upsertShrine(input: ShrineInput): Promise<{ id: string; slug: string }> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const regionId = await resolveId(client, "regions", input.region);
    const prefectureId = await resolveId(client, "prefectures", input.prefecture);

    // Check if shrine already exists
    const existing = await client.query("SELECT id FROM shrines WHERE slug = $1", [input.slug]);
    let shrineId: string;

    if (existing.rows[0]) {
      shrineId = existing.rows[0].id as string;
      // Cascade-delete all children; shrine row stays so we UPDATE it
      await client.query("DELETE FROM shrine_deities WHERE shrine_id = $1", [shrineId]);
      await client.query("DELETE FROM shrine_ranks WHERE shrine_id = $1", [shrineId]);
      await client.query("DELETE FROM shrine_prayer_categories WHERE shrine_id = $1", [shrineId]);
      await client.query("DELETE FROM shrine_details WHERE shrine_id = $1", [shrineId]);
      await client.query("DELETE FROM sources WHERE shrine_id = $1", [shrineId]);
      // NB: festivals are NOT wiped here — they are upserted by (shrine_id, name_en) below so that
      // their separately-uploaded festival_occurrences survive a shrine re-import/inline edit.

      await client.query(
        `UPDATE shrines SET
          name_en=$1, name_ja=$2, prefecture_id=$3, region_id=$4,
          city=$5, address=$6, lat=$7, lng=$8, image_urls=$9, updated_at=now()
         WHERE id=$10`,
        [
          input.name_en, input.name_ja ?? null, prefectureId, regionId,
          input.city ?? null, input.address ?? null,
          input.coordinates?.lat ?? null, input.coordinates?.lng ?? null,
          input.image_urls ?? null,
          shrineId,
        ],
      );
    } else {
      const ins = await client.query(
        `INSERT INTO shrines (slug,name_en,name_ja,prefecture_id,region_id,city,address,lat,lng,image_urls)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
        [
          input.slug, input.name_en, input.name_ja ?? null, prefectureId, regionId,
          input.city ?? null, input.address ?? null,
          input.coordinates?.lat ?? null, input.coordinates?.lng ?? null,
          input.image_urls ?? null,
        ],
      );
      shrineId = ins.rows[0].id as string;
    }

    // shrine_details (1:1)
    if (input.details) {
      await client.query(
        "INSERT INTO shrine_details (shrine_id,history,description,prayer_focus,best_time,quote) VALUES ($1,$2,$3,$4,$5,$6)",
        [shrineId, input.details.history ?? null, input.details.description ?? null, input.details.prayer_focus ?? null, input.details.best_time ?? null, input.details.quote ?? null],
      );
    }

    // shrine_ranks + shrine_prayer_categories — resolve every catalog name from a
    // single prefetch of each (tiny, static) table, then write all rows in one
    // multi-row INSERT, instead of a SELECT + INSERT round-trip per name.
    const rankNames = input.ranks ?? [];
    if (rankNames.length) {
      const rankIdByName = await catalogMap(client, "ranks");
      const rankIds = rankNames.map((name) => {
        const id = rankIdByName.get(name);
        if (id == null) throw new Error(`Unknown ranks name: "${name}"`);
        return id;
      });
      await insertJunction(client, "shrine_ranks", "rank_id", shrineId, rankIds);
    }

    const catNames = input.prayer_categories ?? [];
    if (catNames.length) {
      const catIdByName = await catalogMap(client, "prayer_categories");
      const catIds = catNames.map((name) => {
        const id = catIdByName.get(name);
        if (id == null) throw new Error(`Unknown prayer_categories name: "${name}"`);
        return id;
      });
      await insertJunction(client, "shrine_prayer_categories", "category_id", shrineId, catIds);
    }

    // deities + shrine_deities
    for (const d of input.deities) {
      const deityId = await resolveDeity(client, d);
      await client.query(
        "INSERT INTO shrine_deities (shrine_id,deity_id,is_primary,sort_order,regional_lore) VALUES ($1,$2,$3,$4,$5)",
        [shrineId, deityId, d.is_primary, d.sort_order, d.regional_lore ?? null],
      );
    }

    // festivals + festival_occurrences — identity-stable: upsert by (shrine_id, name_en) so a
    // festival keeps its id (and its occurrences) across shrine re-imports. Inline occurrences also
    // upsert by (festival_id, year); existing occurrence rows not in the input are left untouched.
    const inputFestivalNames = (input.festivals ?? []).map((f) => f.name_en);
    // Remove festivals the admin dropped from the input (their occurrences cascade — correct).
    await client.query(
      "DELETE FROM festivals WHERE shrine_id = $1 AND name_en <> ALL($2)",
      [shrineId, inputFestivalNames],
    );
    for (const f of input.festivals ?? []) {
      const fRes = await client.query(
        `INSERT INTO festivals (shrine_id,name_en,name_ja,time_prose,start_date,end_date,origin,meaning,ritual,prayer,festival_type,visitor_notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         ON CONFLICT (shrine_id,name_en) DO UPDATE SET
           name_ja=EXCLUDED.name_ja, time_prose=EXCLUDED.time_prose,
           start_date=EXCLUDED.start_date, end_date=EXCLUDED.end_date,
           origin=EXCLUDED.origin, meaning=EXCLUDED.meaning, ritual=EXCLUDED.ritual,
           prayer=EXCLUDED.prayer, festival_type=EXCLUDED.festival_type, visitor_notes=EXCLUDED.visitor_notes
         RETURNING id`,
        [
          shrineId, f.name_en, f.name_ja ?? null, f.time_prose ?? null,
          f.start_date ?? null, f.end_date ?? null,
          f.origin ?? null, f.meaning ?? null, f.ritual ?? null,
          f.prayer ?? null, f.festival_type ?? null, f.visitor_notes ?? null,
        ],
      );
      const festivalId = fRes.rows[0].id as string;
      for (const occ of f.occurrences ?? []) {
        await client.query(
          `INSERT INTO festival_occurrences (festival_id,year,start_date,end_date,notes)
           VALUES ($1,$2,$3,$4,$5)
           ON CONFLICT (festival_id,year) DO UPDATE SET
             start_date=EXCLUDED.start_date, end_date=EXCLUDED.end_date, notes=EXCLUDED.notes`,
          [festivalId, occ.year, occ.start_date, occ.end_date ?? null, occ.notes ?? null],
        );
      }
    }

    // sources — one multi-row INSERT instead of a round-trip per source.
    const sources = input.sources ?? [];
    if (sources.length) {
      const values = sources.map((_, i) => `($1,$${i * 2 + 2},$${i * 2 + 3})`).join(",");
      const params = [shrineId, ...sources.flatMap((s) => [s.url, s.title ?? null])];
      await client.query(`INSERT INTO sources (shrine_id,url,title) VALUES ${values}`, params);
    }

    await client.query("COMMIT");
    return { id: shrineId, slug: input.slug };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

// Upsert a canonical deity, keyed on name_ja (the kanji dedup key).
// If a deity with that name_ja exists it is updated; otherwise inserted.
export async function upsertDeity(input: DeityInput): Promise<{ id: string; name_ja: string; created: boolean }> {
  const existing = await pool.query("SELECT id FROM deities WHERE name_ja = $1", [input.name_ja]);
  if (existing.rows[0]) {
    const id = existing.rows[0].id as string;
    await pool.query(
      "UPDATE deities SET name_en=$1, deity_type=$2, titles=$3, canonical_lore=$4, mythic_sphere=$5 WHERE id=$6",
      [input.name_en, input.deity_type, input.titles ?? null, input.canonical_lore ?? null, input.mythic_sphere ?? null, id],
    );
    return { id, name_ja: input.name_ja, created: false };
  }
  const ins = await pool.query(
    "INSERT INTO deities (name_en, name_ja, deity_type, titles, canonical_lore, mythic_sphere) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id",
    [input.name_en, input.name_ja, input.deity_type, input.titles ?? null, input.canonical_lore ?? null, input.mythic_sphere ?? null],
  );
  return { id: ins.rows[0].id as string, name_ja: input.name_ja, created: true };
}

// Update a canonical deity by id (edit mode). Unlike upsertDeity, this allows
// name_ja itself to change; a collision with another deity's name_ja surfaces as
// a UNIQUE-violation DB error.
export async function updateDeity(id: string, input: DeityInput): Promise<void> {
  const res = await pool.query(
    "UPDATE deities SET name_en=$1, name_ja=$2, deity_type=$3, titles=$4, canonical_lore=$5, mythic_sphere=$6 WHERE id=$7",
    [input.name_en, input.name_ja, input.deity_type, input.titles ?? null, input.canonical_lore ?? null, input.mythic_sphere ?? null, id],
  );
  if (res.rowCount === 0) throw new Error(`No deity with id "${id}"`);
}

// Delete a canonical deity. Blocked when any shrine still links to it
// (shrine_deities.deity_id has no ON DELETE CASCADE — deities are global).
export async function deleteDeity(id: string): Promise<void> {
  const refs = await pool.query("SELECT count(*)::int AS n FROM shrine_deities WHERE deity_id = $1", [id]);
  const n = refs.rows[0].n as number;
  if (n > 0) throw new Error(`Cannot delete: this deity is linked to ${n} shrine${n === 1 ? "" : "s"}. Unlink it first.`);
  await pool.query("DELETE FROM deities WHERE id = $1", [id]);
}

export async function deleteShrine(slug: string): Promise<void> {
  // ON DELETE CASCADE handles all child rows except deities (intentionally kept)
  await pool.query("DELETE FROM shrines WHERE slug = $1", [slug]);
}

// Bulk-upsert yearly festival dates. Each target resolves a festival via (shrine_slug, festival_name_en)
// — unique thanks to festivals' UNIQUE(shrine_id, name_en) — then upserts its occurrences on
// (festival_id, year). Returns how many occurrence rows were written. All-or-nothing in one transaction.
export async function upsertOccurrences(
  targets: OccurrenceImportTarget[],
): Promise<{ count: number }> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    let count = 0;
    for (const t of targets) {
      const fRes = await client.query(
        `SELECT f.id FROM festivals f
         JOIN shrines s ON s.id = f.shrine_id
         WHERE s.slug = $1 AND f.name_en = $2`,
        [t.shrine_slug, t.festival_name_en],
      );
      if (!fRes.rows[0]) {
        throw new Error(`No festival "${t.festival_name_en}" found at shrine "${t.shrine_slug}"`);
      }
      const festivalId = fRes.rows[0].id as string;
      for (const occ of t.occurrences) {
        await client.query(
          `INSERT INTO festival_occurrences (festival_id,year,start_date,end_date,notes)
           VALUES ($1,$2,$3,$4,$5)
           ON CONFLICT (festival_id,year) DO UPDATE SET
             start_date=EXCLUDED.start_date, end_date=EXCLUDED.end_date, notes=EXCLUDED.notes`,
          [festivalId, occ.year, occ.start_date, occ.end_date ?? null, occ.notes ?? null],
        );
        count++;
      }
    }
    await client.query("COMMIT");
    return { count };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
