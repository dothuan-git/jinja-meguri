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
  const { name_en, name_ja, name_romaji, deity_type, titles, titles_ja, canonical_lore, canonical_lore_ja } = deity.canonical;
  const ins = await client.query(
    "INSERT INTO deities (name_en, name_ja, name_romaji, deity_type, titles, titles_ja, canonical_lore, canonical_lore_ja, mythic_sphere, mythic_sphere_ja) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id",
    [name_en, name_ja ?? deity.name_ja, name_romaji ?? null, deity_type, titles ?? null, titles_ja ?? null, canonical_lore ?? null, canonical_lore_ja ?? null, null, null],
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
      await client.query("DELETE FROM shrine_highlights WHERE shrine_id = $1", [shrineId]);
      await client.query("DELETE FROM sources WHERE shrine_id = $1", [shrineId]);
      // NB: festivals are NOT wiped here — they are upserted by (shrine_id, name_en) below so that
      // their separately-uploaded festival_occurrences survive a shrine re-import/inline edit.

      await client.query(
        `UPDATE shrines SET
          name_en=$1, name_ja=$2, name_romaji=$3, prefecture_id=$4, region_id=$5,
          city=$6, city_ja=$7, address=$8, address_ja=$9, lat=$10, lng=$11, image_urls=$12, updated_at=now()
         WHERE id=$13`,
        [
          input.name_en, input.name_ja ?? null, input.name_romaji ?? null, prefectureId, regionId,
          input.city ?? null, input.city_ja ?? null, input.address ?? null, input.address_ja ?? null,
          input.coordinates?.lat ?? null, input.coordinates?.lng ?? null,
          input.image_urls ?? null,
          shrineId,
        ],
      );
    } else {
      const ins = await client.query(
        `INSERT INTO shrines (slug,name_en,name_ja,name_romaji,prefecture_id,region_id,city,city_ja,address,address_ja,lat,lng,image_urls)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id`,
        [
          input.slug, input.name_en, input.name_ja ?? null, input.name_romaji ?? null, prefectureId, regionId,
          input.city ?? null, input.city_ja ?? null, input.address ?? null, input.address_ja ?? null,
          input.coordinates?.lat ?? null, input.coordinates?.lng ?? null,
          input.image_urls ?? null,
        ],
      );
      shrineId = ins.rows[0].id as string;
    }

    // shrine_details (1:1)
    if (input.details) {
      await client.query(
        "INSERT INTO shrine_details (shrine_id,history,history_ja,description,description_ja,prayer_focus,prayer_focus_ja,best_time,best_time_ja,quote,quote_ja,geographic_notes,geographic_notes_ja) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)",
        [shrineId, input.details.history ?? null, input.details.history_ja ?? null, input.details.description ?? null, input.details.description_ja ?? null, input.details.prayer_focus ?? null, input.details.prayer_focus_ja ?? null, input.details.best_time ?? null, input.details.best_time_ja ?? null, input.details.quote ?? null, input.details.quote_ja ?? null, input.details.geographic_notes ?? null, input.details.geographic_notes_ja ?? null],
      );
    }

    // shrine_highlights (1:N) — array index is the display order; skip blank titles.
    const highlights = (input.highlights ?? []).filter((h) => h.title.trim() !== "");
    for (const [i, h] of highlights.entries()) {
      await client.query(
        "INSERT INTO shrine_highlights (shrine_id,title,title_ja,body,body_ja,sort_order) VALUES ($1,$2,$3,$4,$5,$6)",
        [shrineId, h.title.trim(), h.title_ja?.trim() || null, h.body?.trim() || null, h.body_ja?.trim() || null, h.sort_order ?? i],
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
        "INSERT INTO shrine_deities (shrine_id,deity_id,is_primary,sort_order,regional_lore,regional_lore_ja,alter_name_en,alter_name_ja,alter_titles,alter_titles_ja) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)",
        [shrineId, deityId, d.is_primary, d.sort_order, d.regional_lore ?? null, d.regional_lore_ja ?? null, d.alter_name_en ?? null, d.alter_name_ja ?? null, d.alter_titles ?? null, d.alter_titles_ja ?? null],
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
    for (const [i, f] of (input.festivals ?? []).entries()) {
      const fRes = await client.query(
        `INSERT INTO festivals (shrine_id,name_en,name_ja,name_romaji,time_prose,time_prose_ja,start_date,end_date,origin,origin_ja,meaning,meaning_ja,ritual,ritual_ja,prayer,prayer_ja,festival_type,visitor_notes,visitor_notes_ja,sort_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
         ON CONFLICT (shrine_id,name_en) DO UPDATE SET
           name_ja=EXCLUDED.name_ja, name_romaji=EXCLUDED.name_romaji, time_prose=EXCLUDED.time_prose, time_prose_ja=EXCLUDED.time_prose_ja,
           start_date=EXCLUDED.start_date, end_date=EXCLUDED.end_date,
           origin=EXCLUDED.origin, origin_ja=EXCLUDED.origin_ja, meaning=EXCLUDED.meaning, meaning_ja=EXCLUDED.meaning_ja,
           ritual=EXCLUDED.ritual, ritual_ja=EXCLUDED.ritual_ja,
           prayer=EXCLUDED.prayer, prayer_ja=EXCLUDED.prayer_ja, festival_type=EXCLUDED.festival_type,
           visitor_notes=EXCLUDED.visitor_notes, visitor_notes_ja=EXCLUDED.visitor_notes_ja,
           sort_order=EXCLUDED.sort_order
         RETURNING id`,
        [
          shrineId, f.name_en, f.name_ja ?? null, f.name_romaji ?? null, f.time_prose ?? null, f.time_prose_ja ?? null,
          f.start_date ?? null, f.end_date ?? null,
          f.origin ?? null, f.origin_ja ?? null, f.meaning ?? null, f.meaning_ja ?? null,
          f.ritual ?? null, f.ritual_ja ?? null,
          f.prayer ?? null, f.prayer_ja ?? null, f.festival_type ?? null, f.visitor_notes ?? null, f.visitor_notes_ja ?? null, i,
        ],
      );
      const festivalId = fRes.rows[0].id as string;
      for (const occ of f.occurrences ?? []) {
        await client.query(
          `INSERT INTO festival_occurrences (festival_id,year,start_date,end_date,notes,notes_ja)
           VALUES ($1,$2,$3,$4,$5,$6)
           ON CONFLICT (festival_id,year) DO UPDATE SET
             start_date=EXCLUDED.start_date, end_date=EXCLUDED.end_date, notes=EXCLUDED.notes, notes_ja=EXCLUDED.notes_ja`,
          [festivalId, occ.year, occ.start_date, occ.end_date ?? null, occ.notes ?? null, occ.notes_ja ?? null],
        );
      }
    }

    // sources — one multi-row INSERT instead of a round-trip per source.
    const sources = input.sources ?? [];
    if (sources.length) {
      const values = sources.map((_, i) => `($1,$${i * 3 + 2},$${i * 3 + 3},$${i * 3 + 4})`).join(",");
      const params = [shrineId, ...sources.flatMap((s) => [s.url, s.title ?? null, s.title_ja ?? null])];
      await client.query(`INSERT INTO sources (shrine_id,url,title,title_ja) VALUES ${values}`, params);
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
      "UPDATE deities SET name_en=$1, name_romaji=$2, deity_type=$3, titles=$4, titles_ja=$5, canonical_lore=$6, canonical_lore_ja=$7, mythic_sphere=$8, mythic_sphere_ja=$9 WHERE id=$10",
      [input.name_en, input.name_romaji ?? null, input.deity_type, input.titles ?? null, input.titles_ja ?? null, input.canonical_lore ?? null, input.canonical_lore_ja ?? null, input.mythic_sphere ?? null, input.mythic_sphere_ja ?? null, id],
    );
    return { id, name_ja: input.name_ja, created: false };
  }
  const ins = await pool.query(
    "INSERT INTO deities (name_en, name_ja, name_romaji, deity_type, titles, titles_ja, canonical_lore, canonical_lore_ja, mythic_sphere, mythic_sphere_ja) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id",
    [input.name_en, input.name_ja, input.name_romaji ?? null, input.deity_type, input.titles ?? null, input.titles_ja ?? null, input.canonical_lore ?? null, input.canonical_lore_ja ?? null, input.mythic_sphere ?? null, input.mythic_sphere_ja ?? null],
  );
  return { id: ins.rows[0].id as string, name_ja: input.name_ja, created: true };
}

// Update a canonical deity by id (edit mode). Unlike upsertDeity, this allows
// name_ja itself to change; a collision with another deity's name_ja surfaces as
// a UNIQUE-violation DB error.
export async function updateDeity(id: string, input: DeityInput): Promise<void> {
  const res = await pool.query(
    "UPDATE deities SET name_en=$1, name_ja=$2, name_romaji=$3, deity_type=$4, titles=$5, titles_ja=$6, canonical_lore=$7, canonical_lore_ja=$8, mythic_sphere=$9, mythic_sphere_ja=$10 WHERE id=$11",
    [input.name_en, input.name_ja, input.name_romaji ?? null, input.deity_type, input.titles ?? null, input.titles_ja ?? null, input.canonical_lore ?? null, input.canonical_lore_ja ?? null, input.mythic_sphere ?? null, input.mythic_sphere_ja ?? null, id],
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
          `INSERT INTO festival_occurrences (festival_id,year,start_date,end_date,notes,notes_ja)
           VALUES ($1,$2,$3,$4,$5,$6)
           ON CONFLICT (festival_id,year) DO UPDATE SET
             start_date=EXCLUDED.start_date, end_date=EXCLUDED.end_date, notes=EXCLUDED.notes, notes_ja=EXCLUDED.notes_ja`,
          [festivalId, occ.year, occ.start_date, occ.end_date ?? null, occ.notes ?? null, occ.notes_ja ?? null],
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
