import "server-only";
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
  "events",
  "event_deities",
  "event_occurrences",
  "sources",
  "shrine_search",
];

export function buildStore(raw: Record<string, unknown[]>): Store {
  const store = {} as Store;
  const target = store as unknown as Record<string, unknown[]>;
  for (const t of TABLES) target[t] = raw[t] ?? [];
  return store;
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: true,
  max: 2,
});

let cached: Store | null = null;

export async function loadStore(): Promise<Store> {
  if (cached) return cached;

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
      events,
      eventDeities,
      occurrencesRaw,
      sources,
      shrineSearchRaw,
    ] = await Promise.all([
      client.query("SELECT * FROM regions"),
      client.query("SELECT * FROM prefectures"),
      client.query("SELECT * FROM ranks"),
      client.query("SELECT * FROM prayer_categories"),
      client.query("SELECT * FROM deities"),
      client.query("SELECT id, slug, name_en, name_ja, prefecture_id, region_id, city, address, lat, lng, notes FROM shrines"),
      client.query("SELECT * FROM shrine_deities"),
      client.query("SELECT * FROM shrine_ranks"),
      client.query("SELECT * FROM shrine_prayer_categories"),
      client.query("SELECT * FROM shrine_details"),
      client.query("SELECT * FROM events"),
      client.query("SELECT * FROM event_deities"),
      client.query("SELECT id, event_id, shrine_id, start_date::text, end_date::text FROM event_occurrences"),
      client.query("SELECT * FROM sources"),
      client.query("SELECT shrine_id, slug, name_en, name_ja, city, search_blob FROM shrine_search"),
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
    raw["events"] = events.rows;
    raw["event_deities"] = eventDeities.rows;
    raw["event_occurrences"] = occurrencesRaw.rows;
    raw["sources"] = sources.rows;
    raw["shrine_search"] = shrineSearchRaw.rows;

    cached = buildStore(raw);
    return cached;
  } finally {
    client.release();
  }
}
