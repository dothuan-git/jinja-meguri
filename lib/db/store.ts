import "server-only";
import { cache } from "react";
import pg from "pg";
import type { Store } from "@/lib/types";

const TABLES: (keyof Store)[] = [
  "regions",
  "prefectures",
  "ranks",
  "prayer_categories",
  "deities",
  "shrines",
  "shrine_deities",
  "shrine_ranks",
  "shrine_prayer_categories",
  "shrine_details",
  "festivals",
  "sources",
  "festival_occurrences",
];

export function buildStore(raw: Record<string, unknown[]>): Store {
  const store = {} as Store;
  const target = store as unknown as Record<string, unknown[]>;
  for (const t of TABLES) target[t] = raw[t] ?? [];
  return store;
}

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: true },
  max: 5,
});

// React cache() dedupes within a single request; a fresh cache is created per
// request, so admin writes are always reflected on the next page load.
export const loadStore = cache(async (): Promise<Store> => {
  const client = await pool.connect();
  try {
    const raw: Record<string, unknown[]> = {};

    const [
      regions,
      prefectures,
      ranks,
      prayerCategories,
      deities,
      shrinesRaw,
      shrineDeities,
      shrineRanks,
      shrinePrayerCategories,
      shrineDetails,
      festivalsRaw,
      sources,
      festivalOccurrences,
    ] = await Promise.all([
      client.query("SELECT * FROM regions"),
      client.query("SELECT * FROM prefectures"),
      client.query("SELECT * FROM ranks"),
      client.query("SELECT * FROM prayer_categories"),
      client.query("SELECT * FROM deities"),
      client.query("SELECT id, slug, name_en, name_ja, prefecture_id, region_id, city, address, lat, lng, image_urls, notes FROM shrines"),
      client.query("SELECT * FROM shrine_deities"),
      client.query("SELECT * FROM shrine_ranks"),
      client.query("SELECT * FROM shrine_prayer_categories"),
      client.query("SELECT * FROM shrine_details"),
      client.query("SELECT id, shrine_id, name_en, name_ja, time_prose, start_date::text, end_date::text, origin, meaning, ritual, prayer, festival_type, visitor_notes FROM festivals"),
      client.query("SELECT * FROM sources"),
      client.query("SELECT id, festival_id, year, start_date::text, end_date::text, notes FROM festival_occurrences"),
    ]);

    raw["regions"] = regions.rows;
    raw["prefectures"] = prefectures.rows;
    raw["ranks"] = ranks.rows;
    raw["prayer_categories"] = prayerCategories.rows;
    raw["deities"] = deities.rows;
    raw["shrines"] = shrinesRaw.rows.map((r) => ({
      ...r,
      coordinates: r.lat != null && r.lng != null ? { lat: Number(r.lat), lng: Number(r.lng) } : null,
      lat: undefined,
      lng: undefined,
    }));
    raw["shrine_deities"] = shrineDeities.rows;
    raw["shrine_ranks"] = shrineRanks.rows;
    raw["shrine_prayer_categories"] = shrinePrayerCategories.rows;
    raw["shrine_details"] = shrineDetails.rows;
    raw["festivals"] = festivalsRaw.rows;
    raw["sources"] = sources.rows;
    raw["festival_occurrences"] = festivalOccurrences.rows;

    return buildStore(raw);
  } finally {
    client.release();
  }
});
