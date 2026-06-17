import "server-only";
import { pool } from "@/lib/db/store";
import type { ShrineInput } from "@/lib/admin/shrineContract";
import type { DeityInput } from "@/lib/admin/deityContract";
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
    "INSERT INTO deities (name_en, name_ja, deity_type, titles, canonical_lore) VALUES ($1,$2,$3,$4,$5) RETURNING id",
    [name_en, name_ja ?? deity.name_ja, deity_type, titles ?? null, canonical_lore ?? null],
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
      await client.query("DELETE FROM festivals WHERE shrine_id = $1", [shrineId]);
      await client.query("DELETE FROM sources WHERE shrine_id = $1", [shrineId]);

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

    // shrine_ranks
    for (const rankName of input.ranks ?? []) {
      const rankId = await resolveId(client, "ranks", rankName);
      await client.query("INSERT INTO shrine_ranks (shrine_id,rank_id) VALUES ($1,$2)", [shrineId, rankId]);
    }

    // shrine_prayer_categories
    for (const catName of input.prayer_categories ?? []) {
      const catId = await resolveId(client, "prayer_categories", catName);
      await client.query("INSERT INTO shrine_prayer_categories (shrine_id,category_id) VALUES ($1,$2)", [shrineId, catId]);
    }

    // deities + shrine_deities
    for (const d of input.deities) {
      const deityId = await resolveDeity(client, d);
      await client.query(
        "INSERT INTO shrine_deities (shrine_id,deity_id,is_primary,sort_order,regional_lore) VALUES ($1,$2,$3,$4,$5)",
        [shrineId, deityId, d.is_primary, d.sort_order, d.regional_lore ?? null],
      );
    }

    // festivals + festival_occurrences
    for (const f of input.festivals ?? []) {
      const fRes = await client.query(
        `INSERT INTO festivals (shrine_id,name_en,name_ja,time_prose,start_date,end_date,origin,meaning,ritual,prayer,festival_type,visitor_notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
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
          "INSERT INTO festival_occurrences (festival_id,year,start_date,end_date,notes) VALUES ($1,$2,$3,$4,$5)",
          [festivalId, occ.year, occ.start_date, occ.end_date ?? null, occ.notes ?? null],
        );
      }
    }

    // sources
    for (const src of input.sources ?? []) {
      await client.query("INSERT INTO sources (shrine_id,url,title) VALUES ($1,$2,$3)", [shrineId, src.url, src.title ?? null]);
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
      "UPDATE deities SET name_en=$1, deity_type=$2, titles=$3, canonical_lore=$4 WHERE id=$5",
      [input.name_en, input.deity_type, input.titles ?? null, input.canonical_lore ?? null, id],
    );
    return { id, name_ja: input.name_ja, created: false };
  }
  const ins = await pool.query(
    "INSERT INTO deities (name_en, name_ja, deity_type, titles, canonical_lore) VALUES ($1,$2,$3,$4,$5) RETURNING id",
    [input.name_en, input.name_ja, input.deity_type, input.titles ?? null, input.canonical_lore ?? null],
  );
  return { id: ins.rows[0].id as string, name_ja: input.name_ja, created: true };
}

// Update a canonical deity by id (edit mode). Unlike upsertDeity, this allows
// name_ja itself to change; a collision with another deity's name_ja surfaces as
// a UNIQUE-violation DB error.
export async function updateDeity(id: string, input: DeityInput): Promise<void> {
  const res = await pool.query(
    "UPDATE deities SET name_en=$1, name_ja=$2, deity_type=$3, titles=$4, canonical_lore=$5 WHERE id=$6",
    [input.name_en, input.name_ja, input.deity_type, input.titles ?? null, input.canonical_lore ?? null, id],
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
