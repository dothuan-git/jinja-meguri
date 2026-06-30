import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import pg from "pg";
import type { Store } from "@/lib/types";

// Data Cache tag for the whole Store. The admin server actions call
// revalidateTag(STORE_TAG) after every write so the next render re-reads Neon.
export const STORE_TAG = "store";

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
  "shrine_highlights",
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
  // Headroom for loadStore's 14 concurrent queries (below) plus an in-flight
  // mutation transaction. The Neon pooled endpoint (pgbouncer) multiplexes these.
  max: 16,
});

// The raw DB read. Pure (no cookies/headers), so it is safe to wrap in the Next
// Data Cache below. Each query goes through `pool.query` (not one checked-out
// client), so the pool gives each its own connection and they run *genuinely* in
// parallel — a single pg client serializes queries through one connection.
async function fetchStore(): Promise<Store> {
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
    shrineHighlights,
    festivalsRaw,
    sources,
    festivalOccurrences,
  ] = await Promise.all([
    pool.query("SELECT * FROM regions"),
    pool.query("SELECT * FROM prefectures"),
    pool.query("SELECT * FROM ranks"),
    pool.query("SELECT * FROM prayer_categories"),
    pool.query("SELECT * FROM deities"),
    pool.query("SELECT id, slug, name_en, name_ja, prefecture_id, region_id, city, address, lat, lng, image_urls FROM shrines"),
    pool.query("SELECT * FROM shrine_deities"),
    pool.query("SELECT * FROM shrine_ranks"),
    pool.query("SELECT * FROM shrine_prayer_categories"),
    pool.query("SELECT * FROM shrine_details"),
    pool.query("SELECT * FROM shrine_highlights"),
    pool.query("SELECT id, shrine_id, name_en, name_ja, time_prose, start_date::text, end_date::text, origin, meaning, ritual, prayer, festival_type, visitor_notes FROM festivals"),
    pool.query("SELECT * FROM sources"),
    pool.query("SELECT id, festival_id, year, start_date::text, end_date::text, notes FROM festival_occurrences"),
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
  raw["shrine_highlights"] = shrineHighlights.rows;
  raw["festivals"] = festivalsRaw.rows;
  raw["sources"] = sources.rows;
  raw["festival_occurrences"] = festivalOccurrences.rows;

  return buildStore(raw);
}

// Cross-request cache: the assembled Store is cached in the Next Data Cache under
// STORE_TAG and reused across requests until an admin write calls
// revalidateTag(STORE_TAG). The 1-hour `revalidate` is a safety net for any
// out-of-band DB change (e.g. db:reset) that bypasses the server actions.
const getCachedStore = unstable_cache(fetchStore, ["store"], {
  tags: [STORE_TAG],
  revalidate: 3600,
});

// React cache() additionally dedupes the cached read within a single request.
export const loadStore = cache((): Promise<Store> => getCachedStore());
