// --- Catalog / row types (mirror db/*.json) ---
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
  code: string;
  name_en: string;
  name_ja: string | null;
  rank_order: number;
  description?: string | null;
}
export interface PrayerCategory {
  id: number;
  code: string;
  name_en: string;
  name_ja: string | null;
  group_label: string;
}
export interface Deity {
  id: number;
  name_romaji: string;
  name_kanji: string | null;
  domain: string | null;
  title: string | null;
  deity_type: string;
  canonical_lore: string | null;
}
export interface Coordinates {
  lat: number;
  lng: number;
}
export interface ShrineRow {
  id: number;
  slug: string;
  name_en: string;
  name_ja: string | null;
  prefecture_id: number;
  region_id: number;
  city: string | null;
  address: string | null;
  coordinates: Coordinates | null;
  notes: string | null;
}
export interface ShrineDeityRow {
  shrine_id: number;
  deity_id: number;
  is_primary: boolean;
  sort_order: number;
  role: string | null;
  regional_lore: string | null;
}
export interface ShrineRankRow {
  shrine_id: number;
  rank_id: number;
}
export interface ShrinePrayerCategoryRow {
  shrine_id: number;
  category_id: number;
}
export interface ShrineDetailRow {
  shrine_id: number;
  history: string | null;
  why_visit: string | null;
  prayer_focus: string | null;
  best_season: string | null;
}
export interface EventRow {
  id: number;
  shrine_id: number;
  name_en: string;
  name_ja: string | null;
  time_prose: string | null;
  origin: string | null;
  meaning: string | null;
  ritual: string | null;
  prayer: string | null;
  access_type: string | null;
  visitor_notes: string | null;
}
export interface EventDeityRow {
  event_id: number;
  deity_id: number;
  role: string | null;
}
export interface OccurrenceRow {
  id: number;
  event_id: number;
  shrine_id: number;
  start_date: string;
  end_date: string;
}
export interface SourceRow {
  id: number;
  shrine_id: number;
  url: string;
  title: string | null;
  source_type: string | null;
  note: string | null;
}
export interface SearchRow {
  shrine_id: number;
  slug: string;
  name_en: string;
  name_ja: string | null;
  city: string | null;
  search_blob: string;
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
  events: EventRow[];
  event_deities: EventDeityRow[];
  event_occurrences: OccurrenceRow[];
  sources: SourceRow[];
  shrine_search: SearchRow[];
}

// --- View models (what the UI consumes) ---
export interface RankView {
  code: string;
  name_en: string;
  name_ja: string | null;
  rank_order: number;
  is_highest: boolean;
}
export interface CategoryView {
  code: string;
  name_en: string;
  name_ja: string | null;
  group_label: string;
}
export interface DeityView {
  id: number;
  name_romaji: string;
  name_kanji: string | null;
  role: string | null;
  domain: string | null;
  title: string | null;
  deity_type: string;
  lore: string | null;
  is_regional: boolean;
  is_primary: boolean;
  sort_order: number;
}
export interface EventView {
  id: number;
  name_en: string;
  name_ja: string | null;
  time_prose: string | null;
  origin: string | null;
  meaning: string | null;
  ritual: string | null;
  prayer: string | null;
  access_type: string | null;
  visitor_notes: string | null;
}

export interface ShrineCard {
  slug: string;
  name_en: string;
  name_ja: string | null;
  city: string | null;
  prefecture: string;
  region: string;
  primary_deity: { name_romaji: string; name_kanji: string | null } | null;
  categories: CategoryView[];
  highest_rank: RankView | null;
  // Facet membership for client filtering:
  region_id: number;
  prefecture_id: number;
  rank_codes: string[];
  category_codes: string[];
  deity_kanji: string[];
}

export interface ShrineDetail extends ShrineCard {
  address: string | null;
  coordinates: Coordinates | null;
  notes: string | null;
  deities: DeityView[];
  ranks: RankView[];
  details: {
    history: string | null;
    why_visit: string | null;
    prayer_focus: string | null;
    best_season: string | null;
  } | null;
  events: EventView[];
  sources: SourceRow[];
}

export interface FacetCatalogs {
  categoryGroups: { group_label: string; categories: CategoryView[] }[];
  ranks: RankView[];
  regions: Region[];
  prefecturesByRegion: Record<number, Prefecture[]>;
  deities: { name_romaji: string; name_kanji: string }[];
}

export interface CalendarEntry {
  event_id: number;
  shrine_slug: string;
  shrine_name_en: string;
  event_name_en: string;
  event_name_ja: string | null;
  region: string;
  region_id: number;
  category_codes: string[];
  start_date: string | null;
  end_date: string | null;
  time_prose: string | null;
  is_fallback: boolean;
}

export interface SearchDoc {
  slug: string;
  name_en: string;
  name_ja: string | null;
  city: string | null;
  blob: string;
}
export interface SearchResult {
  slug: string;
  name_en: string;
  name_ja: string | null;
  city: string | null;
  score: number;
}
