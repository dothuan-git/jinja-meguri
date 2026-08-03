// --- Catalog / row types (mirror DB tables) ---
export interface Region {
  id: number;
  name_en: string;
  name_ja: string | null;
}
export interface Prefecture {
  id: number;
  name_en: string;
  name_ja: string | null;
  region_id: number;
}
export interface Rank {
  id: number;
  name_en: string;
  description: string | null;
  description_ja: string | null;
  name_ja: string | null;
  rank_order: number;
}
export interface PrayerCategory {
  id: number;
  name_en: string;
  name_ja: string | null;
  group_label: string;
  group_label_ja: string | null;
}
export interface Deity {
  id: string;
  name_en: string;
  name_ja: string | null;
  name_hiragana: string | null;
  titles: string[] | null;
  titles_ja: string[] | null;
  deity_type: string;
  canonical_lore: string | null;
  canonical_lore_ja: string | null;
  mythic_sphere: string | null;
  mythic_sphere_ja: string | null;
}
export interface Coordinates {
  lat: number;
  lng: number;
}
export interface ShrineRow {
  id: string;
  slug: string;
  name_en: string;
  name_ja: string | null;
  name_hiragana: string | null;
  prefecture_id: number;
  region_id: number;
  city: string | null;
  city_ja: string | null;
  address: string | null;
  address_ja: string | null;
  coordinates: Coordinates | null;
  image_urls: string[] | null;
}
export interface ShrineDeityRow {
  shrine_id: string;
  deity_id: string;
  is_primary: boolean;
  sort_order: number;
  regional_lore: string | null;
  regional_lore_ja: string | null;
  // Shrine-specific alternate (enshrined) name. When set, the UI displays this in
  // place of the canonical deity name at this shrine; canonical lore is still
  // sourced from the deities table. null = fall back to deities.name_en/name_ja.
  alter_name_en: string | null;
  alter_name_ja: string | null;
  // Shrine-specific title/epithet override. null = fall back to deities.titles.
  alter_titles: string[] | null;
  // JA title override; null = fall back to the whole alter_titles array.
  alter_titles_ja: string[] | null;
}
export interface ShrineRankRow {
  shrine_id: string;
  rank_id: number;
}
export interface ShrinePrayerCategoryRow {
  shrine_id: string;
  category_id: number;
}
export interface ShrineDetailRow {
  shrine_id: string;
  history: string | null;
  history_ja: string | null;
  description: string | null;
  description_ja: string | null;
  prayer_focus: string | null;
  prayer_focus_ja: string | null;
  best_time: string | null;
  best_time_ja: string | null;
  quote: string | null;
  quote_ja: string | null;
  geographic_notes: string | null;
  geographic_notes_ja: string | null;
}
export interface ShrineHighlightRow {
  id: string;
  shrine_id: string;
  title: string;
  title_ja: string | null;
  body: string | null;
  body_ja: string | null;
  sort_order: number;
}
export interface FestivalRow {
  id: string;
  shrine_id: string;
  name_en: string;
  name_ja: string | null;
  name_hiragana: string | null;
  time_prose: string | null;
  time_prose_ja: string | null;
  start_date: string | null;
  end_date: string | null;
  origin: string | null;
  origin_ja: string | null;
  meaning: string | null;
  meaning_ja: string | null;
  ritual: string | null;
  ritual_ja: string | null;
  prayer: string | null;
  prayer_ja: string | null;
  festival_type: string | null;
  visitor_notes: string | null;
  visitor_notes_ja: string | null;
  sort_order: number;
}
export interface SourceRow {
  id: string;
  shrine_id: string;
  url: string;
  title: string | null;
  title_ja: string | null;
}
export interface FestivalOccurrenceRow {
  id: string;
  festival_id: string;
  year: number;
  start_date: string;
  end_date: string | null;
  notes: string | null;
  notes_ja: string | null;
}

export interface Store {
  regions: Region[];
  prefectures: Prefecture[];
  ranks: Rank[];
  prayer_categories: PrayerCategory[];
  deities: Deity[];
  shrines: ShrineRow[];
  shrine_deities: ShrineDeityRow[];
  shrine_ranks: ShrineRankRow[];
  shrine_prayer_categories: ShrinePrayerCategoryRow[];
  shrine_details: ShrineDetailRow[];
  shrine_highlights: ShrineHighlightRow[];
  festivals: FestivalRow[];
  sources: SourceRow[];
  festival_occurrences: FestivalOccurrenceRow[];
}

// Catalog option lists fed to the admin in-place editor so its dropdowns
// (ranks, prayer categories, prefectures) can offer every valid catalog value.
export interface EditCatalogs {
  ranks: string[]; // all rank name_en, ordered by rank_order
  prayerCategories: string[]; // all category name_en
  prefectures: { name_en: string; region: string }[]; // all 47 + their region name_en
  // Existing deities for the create-flow picker: enough to link by name_ja and to
  // render the linked deity's canonical lore/type/titles read-only on the create page
  // (a per-shrine title override can still be set — see ShrineInput.deities[].alter_titles).
  deities?: {
    id: string;
    name_en: string;
    name_ja: string | null;
    name_hiragana: string | null;
    deity_type: string;
    titles: string[];
    titles_ja: string[] | null;
    canonical_lore: string | null;
    canonical_lore_ja: string | null;
    mythic_sphere: string | null;
    mythic_sphere_ja: string | null;
  }[];
}

// --- View models (what the UI consumes) ---
export interface RankView {
  name_en: string;
  description: string | null;
  name_ja: string | null;
  rank_order: number;
  is_highest: boolean;
}
export interface CategoryView {
  name_en: string;
  name_ja: string | null;
  group_label: string;
}
export interface DeityView {
  id: string;
  name_en: string;
  name_ja: string | null;
  name_hiragana: string | null;
  // Canonical titles (deities.titles); raw, pre-fallback — see alter_titles.
  titles: string[];
  deity_type: string;
  canonical_lore: string | null;
  regional_lore: string | null;
  alter_name_en: string | null;
  alter_name_ja: string | null;
  // Shrine-specific title override (shrine_deities.alter_titles); raw, pre-fallback.
  // Display should use `alter_titles ?? titles`.
  alter_titles: string[] | null;
  is_primary: boolean;
  sort_order: number;
}
// Compact festival summary embedded on ShrineCard for the map marker popup's
// optional "show festivals" display — just enough to name a festival and say
// roughly when it happens, without the full FestivalView payload.
export interface FestivalBrief {
  name_en: string;
  name_ja: string | null;
  name_hiragana: string | null;
  // Human date/time: time_prose when present, else a "Jul 30 – Aug 2" span from
  // the fixed start/end dates, else null (undated lunar / Nth-weekday festival).
  when: string | null;
}
export interface FestivalView {
  id: string;
  name_en: string;
  name_ja: string | null;
  name_hiragana: string | null;
  time_prose: string | null;
  start_date: string | null;
  end_date: string | null;
  origin: string | null;
  meaning: string | null;
  ritual: string | null;
  prayer: string | null;
  festival_type: string | null;
  visitor_notes: string | null;
}

export interface ShrineCard {
  slug: string;
  name_en: string;
  name_ja: string | null;
  name_hiragana: string | null;
  city: string | null;
  prefecture: { name_en: string; name_ja: string | null };
  region: { name_en: string; name_ja: string | null };
  primary_deity: { name_en: string; name_ja: string | null; name_hiragana: string | null } | null;
  categories: CategoryView[];
  ranks: RankView[];
  highest_rank: RankView | null;
  coordinates: Coordinates | null;
  // Facet membership for client filtering:
  region_id: number;
  prefecture_id: number;
  rank_codes: string[];
  category_codes: string[];
  deity_ja: string[];
  // Months (1-12) in which this shrine holds any festival, for the map's
  // festival-season filter. Derived from festival start/end dates, with a
  // fallback to festival_occurrences for lunar / Nth-weekday festivals;
  // undated festivals contribute nothing.
  festival_months: number[];
  // Festivals held at this shrine (sorted), for the map popup's optional
  // festival display; see FestivalBrief.
  festivals_brief: FestivalBrief[];
  prayer_focus: string | null;
  best_time: string | null;
  primary_deity_titles: string[];
}

export interface ShrineDetail extends ShrineCard {
  address: string | null;
  // Kept (not displayed: ShrineImage is a procedural placeholder) because the
  // inline editor round-trips it via buildShrineInput → upsertShrine.
  image_urls: string[] | null;
  deities: DeityView[];
  ranks: RankView[];
  details: {
    history: string | null;
    description: string | null;
    prayer_focus: string | null;
    best_time: string | null;
    quote: string | null;
    geographic_notes: string | null;
  } | null;
  highlights: { title: string; body: string | null }[];
  festivals: FestivalView[];
  sources: SourceRow[];
}

export interface FacetCatalogs {
  categoryGroups: { group_label: string; categories: CategoryView[] }[];
  ranks: RankView[];
  regions: Region[];
  prefecturesByRegion: Record<number, Prefecture[]>;
  deities: { name_en: string; name_ja: string; name_hiragana: string | null }[];
}

export interface DeityShrineLink {
  slug: string;
  name_en: string;
  name_ja: string | null;
  name_hiragana: string | null;
  city: string | null;
  prefecture: { name_en: string; name_ja: string | null };
  region: { name_en: string; name_ja: string | null };
  is_primary: boolean;
  regional_lore: string | null;
}
export interface DeityListItem {
  id: string;
  name_en: string;
  name_ja: string | null;
  name_hiragana: string | null;
  titles: string[];
  deity_type: string;
  canonical_lore: string | null;
  mythic_sphere: string | null;
  shrines: DeityShrineLink[];
}

export interface CalendarFestival {
  festival_id: string;
  shrine_slug: string;
  shrine_name_en: string;
  shrine_name_ja: string | null;
  shrine_name_hiragana: string | null;
  shrine_city: string | null;
  shrine_prefecture: { name_en: string; name_ja: string | null };
  shrine_region: { name_en: string; name_ja: string | null };
  region_id: number;
  festival_name_en: string;
  festival_name_ja: string | null;
  festival_name_hiragana: string | null;
  festival_type: string | null;
  time_prose: string | null;
  start_date: string | null;
  end_date: string | null;
  month: number | null; // 1..12 from start_date; null when undated
  meaning: string | null;
  ritual: string | null;
  prayer: string | null;
  visitor_notes: string | null;
  origin: string | null;
  is_fallback: boolean;
}

export interface CalendarEntry {
  festival_id: string;
  shrine_slug: string;
  shrine_name_en: string;
  shrine_name_ja: string | null;
  shrine_name_hiragana: string | null;
  festival_name_en: string;
  festival_name_ja: string | null;
  festival_name_hiragana: string | null;
  region: string;
  region_id: number;
  category_codes: string[];
  start_date: string | null;
  end_date: string | null;
  time_prose: string | null;
  is_fallback: boolean;
}

// --- Per-user collections (favorites + goshuin stamp book) ---
// `user_shrine_marks` is NOT part of `Store` — it is per-user data read on a
// separate non-cached path (lib/db/userRepo.ts), keyed by the Neon Auth user id.

/** One user↔shrine mark row, joined to the shrine's slug for the UI. */
export interface UserMark {
  slug: string;
  saved_at: string | null; // non-null => favorited
  stamped_at: string | null; // non-null => goshuin collected
}

/** Booleans handed to the client for a single shrine's mark state. */
export interface MarkState {
  saved: boolean;
  stamped: boolean;
}

/** A collected shrine card carrying the goshuin date, for the profile stamp book. */
export type StampEntry = ShrineCard & { stamped_at: string };
/** A saved shrine card carrying the favorited date, for the profile saved list. */
export type SavedEntry = ShrineCard & { saved_at: string };

/** Assembled profile collections (cards joined from the cached Store). */
export interface UserCollections {
  stamped: StampEntry[];
  saved: SavedEntry[];
}

/**
 * Valid kamon crest ids — the server-importable source of truth used to validate
 * crest writes. The full crest definitions (with SVG renderers) live in the client
 * component `components/user/UserProfileClient.tsx`; keep its ids in sync with this.
 */
export const CREST_IDS = ["tomoe", "matsu", "sakura", "ume", "kiku", "fuji"] as const;
export type CrestId = (typeof CREST_IDS)[number];

/** Per-account profile preferences (currently just the chosen crest). */
export interface UserProfile {
  crest: CrestId;
}

export interface SearchDoc {
  slug: string;
  name_en: string;
  name_ja: string | null;
  name_hiragana: string | null;
  city: string | null;
  blob: string;
}
export interface SearchResult {
  slug: string;
  name_en: string;
  name_ja: string | null;
  name_hiragana: string | null;
  city: string | null;
  score: number;
}
