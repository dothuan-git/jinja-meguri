import type { ShrineCard } from "@/lib/types";

// Faceted shrine filtering shared by the listing (/shrines) and the map (/map).
// State lives in the URL; both surfaces read/write the same param names so
// filters survive navigation between them.

export type ShrineFilters = {
  searchQuery: string;
  prayerFocus: string[]; // category name_en values
  ranks: string[];
  region: string[];
  prefecture: string[];
  deity: string[];
};

export const FILTER_PARAM_KEY: Record<Exclude<keyof ShrineFilters, "searchQuery">, string> = {
  prayerFocus: "cat",
  ranks: "rank",
  region: "region",
  prefecture: "pref",
  deity: "deity",
};

export type ShrineFacetId = keyof typeof FILTER_PARAM_KEY;

// Structural param type so this works with both URLSearchParams and
// next/navigation's ReadonlyURLSearchParams.
type ParamsLike = { get(key: string): string | null; getAll(key: string): string[] };

export function readShrineFilters(params: ParamsLike): ShrineFilters {
  return {
    searchQuery: params.get("q") ?? "",
    prayerFocus: params.getAll(FILTER_PARAM_KEY.prayerFocus),
    ranks: params.getAll(FILTER_PARAM_KEY.ranks),
    region: params.getAll(FILTER_PARAM_KEY.region),
    prefecture: params.getAll(FILTER_PARAM_KEY.prefecture),
    deity: params.getAll(FILTER_PARAM_KEY.deity),
  };
}

export function hasActiveShrineFilters(filters: ShrineFilters): boolean {
  return (
    filters.searchQuery !== "" ||
    filters.prayerFocus.length > 0 ||
    filters.ranks.length > 0 ||
    filters.region.length > 0 ||
    filters.prefecture.length > 0 ||
    filters.deity.length > 0
  );
}

export function matchesShrineFilters(card: ShrineCard, filters: ShrineFilters): boolean {
  // Search Term match
  if (filters.searchQuery) {
    const query = filters.searchQuery.toLowerCase();
    const nameMatch = card.name_en.toLowerCase().includes(query) || (card.name_ja ?? "").includes(query);
    const locMatch =
      (card.city ?? "").toLowerCase().includes(query) || card.prefecture.toLowerCase().includes(query);
    const primaryDeityMatch =
      (card.primary_deity?.name_en ?? "").toLowerCase().includes(query) ||
      (card.primary_deity?.name_ja ?? "").includes(query);
    const deityKanjiMatch = card.deity_ja.some((k) => k.includes(query));
    const rankMatch = card.rank_codes.some((r) => r.toLowerCase().includes(query));
    if (!nameMatch && !locMatch && !primaryDeityMatch && !deityKanjiMatch && !rankMatch) return false;
  }

  // Prayer Focus multi-match
  if (filters.prayerFocus.length > 0) {
    if (!card.category_codes.some((f) => filters.prayerFocus.includes(f))) return false;
  }

  // Rank multi-match
  if (filters.ranks.length > 0) {
    if (!card.rank_codes.some((r) => filters.ranks.includes(r))) return false;
  }

  // Region multi-match
  if (filters.region.length > 0 && !filters.region.includes(card.region)) return false;

  // Prefecture multi-match
  if (filters.prefecture.length > 0 && !filters.prefecture.includes(card.prefecture)) return false;

  // Deity multi-match (primary)
  if (filters.deity.length > 0) {
    const deities = card.primary_deity ? [card.primary_deity.name_en] : [];
    if (!deities.some((d) => filters.deity.includes(d))) return false;
  }

  return true;
}
