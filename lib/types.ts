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
  name_ja: string | null;
  rank_order: number;
}
export interface PrayerCategory {
  id: number;
  name_en: string;
  name_ja: string | null;
  group_label: string;
}
export interface Deity {
  id: string;
  name_en: string;
  name_ja: string | null;
  titles: string[] | null;
  deity_type: string;
  canonical_lore: string | null;
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
  prefecture_id: number;
  region_id: number;
  city: string | null;
  address: string | null;
  coordinates: Coordinates | null;
  image_urls: string[] | null;
  notes: string | null;
}
export interface ShrineDeityRow {
  shrine_id: string;
  deity_id: string;
  is_primary: boolean;
  sort_order: number;
  regional_lore: string | null;
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
  description: string | null;
  prayer_focus: string | null;
  best_time: string | null;
}
export interface FestivalRow {
  id: string;
  shrine_id: string;
  name_en: string;
  name_ja: string | null;
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
export interface SourceRow {
  id: string;
  shrine_id: string;
  url: string;
  title: string | null;
}
export interface FestivalOccurrenceRow {
  id: string;
  festival_id: string;
  year: number;
  start_date: string;
  end_date: string | null;
  notes: string | null;
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
  festivals: FestivalRow[];
  sources: SourceRow[];
  festival_occurrences: FestivalOccurrenceRow[];
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
  titles: string[];
  deity_type: string;
  canonical_lore: string | null;
  regional_lore: string | null;
  is_primary: boolean;
  sort_order: number;
}
export interface FestivalView {
  id: string;
  name_en: string;
  name_ja: string | null;
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
  city: string | null;
  prefecture: string;
  region: string;
  primary_deity: { name_en: string; name_ja: string | null } | null;
  categories: CategoryView[];
  highest_rank: RankView | null;
  // Facet membership for client filtering:
  region_id: number;
  prefecture_id: number;
  rank_codes: string[];
  category_codes: string[];
  deity_ja: string[];
  prayer_focus: string | null;
  best_time: string | null;
  primary_deity_titles: string[];
  image_url: string | null;
}

export interface ShrineDetail extends ShrineCard {
  address: string | null;
  coordinates: Coordinates | null;
  image_urls: string[] | null;
  notes: string | null;
  deities: DeityView[];
  ranks: RankView[];
  details: {
    history: string | null;
    description: string | null;
    prayer_focus: string | null;
    best_time: string | null;
  } | null;
  festivals: FestivalView[];
  sources: SourceRow[];
}

export interface FacetCatalogs {
  categoryGroups: { group_label: string; categories: CategoryView[] }[];
  ranks: RankView[];
  regions: Region[];
  prefecturesByRegion: Record<number, Prefecture[]>;
  deities: { name_en: string; name_ja: string }[];
}

export interface DeityShrineLink {
  slug: string;
  name_en: string;
  name_ja: string | null;
  city: string | null;
  prefecture: string;
  region: string;
  is_primary: boolean;
  regional_lore: string | null;
}
export interface DeityListItem {
  id: string;
  name_en: string;
  name_ja: string | null;
  titles: string[];
  deity_type: string;
  canonical_lore: string | null;
  shrines: DeityShrineLink[];
}

export interface CalendarFestival {
  festival_id: string;
  shrine_slug: string;
  shrine_name_en: string;
  shrine_city: string | null;
  shrine_prefecture: string;
  shrine_region: string;
  region_id: number;
  festival_name_en: string;
  festival_name_ja: string | null;
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
  festival_name_en: string;
  festival_name_ja: string | null;
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
