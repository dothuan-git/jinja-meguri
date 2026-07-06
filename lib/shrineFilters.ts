import type { ShrineCard } from "@/lib/types";

// Faceted shrine filtering shared by the listing (/shrines) and the map (/map).
// State lives in the URL; both surfaces read/write the same param names so
// filters survive navigation between them.

// Inclusive month range (1-12). When `from > to` the range wraps the year end
// (e.g. { from: 12, to: 2 } = Dec, Jan, Feb). `null` = no festival-season filter.
export type MonthRange = { from: number; to: number };

export type ShrineFilters = {
  searchQuery: string;
  prayerFocus: string[]; // category name_en values
  ranks: string[];
  region: string[];
  prefecture: string[];
  deity: string[];
  festivalMonths: MonthRange | null;
};

// A month (1-12) falls inside a (possibly year-wrapping) range.
export function monthInRange(month: number, { from, to }: MonthRange): boolean {
  return from <= to ? month >= from && month <= to : month >= from || month <= to;
}

// Only the string[] facets are driven by generic param keys / dropdowns;
// searchQuery and the festivalMonths range are handled separately.
export const FILTER_PARAM_KEY: Record<Exclude<keyof ShrineFilters, "searchQuery" | "festivalMonths">, string> = {
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

// Festival-season range params — map-only, so kept out of FILTER_PARAM_KEY
// (which drives the generic string[] facet dropdowns).
export const FESTIVAL_MONTH_PARAM = { from: "fmFrom", to: "fmTo" } as const;

function readMonthParam(value: string | null): number | null {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 12 ? n : null;
}

export function readShrineFilters(params: ParamsLike): ShrineFilters {
  const from = readMonthParam(params.get(FESTIVAL_MONTH_PARAM.from));
  const to = readMonthParam(params.get(FESTIVAL_MONTH_PARAM.to));
  return {
    searchQuery: params.get("q") ?? "",
    prayerFocus: params.getAll(FILTER_PARAM_KEY.prayerFocus),
    ranks: params.getAll(FILTER_PARAM_KEY.ranks),
    region: params.getAll(FILTER_PARAM_KEY.region),
    prefecture: params.getAll(FILTER_PARAM_KEY.prefecture),
    deity: params.getAll(FILTER_PARAM_KEY.deity),
    festivalMonths: from !== null && to !== null ? { from, to } : null,
  };
}

export function hasActiveShrineFilters(filters: ShrineFilters): boolean {
  return (
    filters.searchQuery !== "" ||
    filters.prayerFocus.length > 0 ||
    filters.ranks.length > 0 ||
    filters.region.length > 0 ||
    filters.prefecture.length > 0 ||
    filters.deity.length > 0 ||
    filters.festivalMonths !== null
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

  // Festival-season match — keep shrines with a festival in the month range.
  if (filters.festivalMonths) {
    if (!card.festival_months.some((m) => monthInRange(m, filters.festivalMonths!))) return false;
  }

  return true;
}
