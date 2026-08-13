import {
  debounce,
  parseAsBoolean,
  parseAsInteger,
  parseAsNativeArrayOf,
  parseAsString,
  type inferParserType,
} from "nuqs";
import { fold } from "@/lib/search";
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
// `as const` keeps the values as literal types so they can key the nuqs parser
// map below without widening to `string`.
export const FILTER_PARAM_KEY = {
  prayerFocus: "cat",
  ranks: "rank",
  region: "region",
  prefecture: "pref",
  deity: "deity",
} as const satisfies Record<Exclude<keyof ShrineFilters, "searchQuery" | "festivalMonths">, string>;

export type ShrineFacetId = keyof typeof FILTER_PARAM_KEY;

// Festival-season range params — map-only, so kept out of FILTER_PARAM_KEY
// (which drives the generic string[] facet dropdowns).
export const FESTIVAL_MONTH_PARAM = { from: "fmFrom", to: "fmTo" } as const;

// ---------------------------------------------------------------------------
// nuqs URL state
//
// Both /shrines and /map filter entirely in the browser — neither page reads
// `searchParams` on the server — so filter changes must not trigger an RSC
// refetch. nuqs defaults to `shallow: true`, which rewrites the address bar via
// the History API and skips the network entirely.
//
// `parseAsNativeArrayOf` uses repeated keys (?region=Kinki&region=Kanto), which
// is the format these params have always used, so existing links keep working.
// ---------------------------------------------------------------------------

const facetList = () => parseAsNativeArrayOf(parseAsString).withDefault([]);

export const shrineFilterParsers = {
  // The state updates synchronously; only the URL write is debounced, purely to
  // stay under Safari's ~100-calls-per-30s History API rate limit.
  q: parseAsString.withDefault("").withOptions({ limitUrlUpdates: debounce(300) }),
  [FILTER_PARAM_KEY.prayerFocus]: facetList(),
  [FILTER_PARAM_KEY.ranks]: facetList(),
  [FILTER_PARAM_KEY.region]: facetList(),
  [FILTER_PARAM_KEY.prefecture]: facetList(),
  [FILTER_PARAM_KEY.deity]: facetList(),
  [FESTIVAL_MONTH_PARAM.from]: parseAsInteger,
  [FESTIVAL_MONTH_PARAM.to]: parseAsInteger,
  saved: parseAsBoolean.withDefault(false),
  collected: parseAsBoolean.withDefault(false),
};

export type ShrineQueryState = {
  [K in keyof typeof shrineFilterParsers]: inferParserType<(typeof shrineFilterParsers)[K]>;
};

// Adapts the flat nuqs state bag to the ShrineFilters shape the predicate below
// consumes, so filter semantics stay in one place.
export function toShrineFilters(qs: ShrineQueryState): ShrineFilters {
  const from = clampMonth(qs[FESTIVAL_MONTH_PARAM.from]);
  const to = clampMonth(qs[FESTIVAL_MONTH_PARAM.to]);
  return {
    searchQuery: qs.q,
    prayerFocus: qs[FILTER_PARAM_KEY.prayerFocus],
    ranks: qs[FILTER_PARAM_KEY.ranks],
    region: qs[FILTER_PARAM_KEY.region],
    prefecture: qs[FILTER_PARAM_KEY.prefecture],
    deity: qs[FILTER_PARAM_KEY.deity],
    festivalMonths: from !== null && to !== null ? { from, to } : null,
  };
}

function clampMonth(value: number | null): number | null {
  return value !== null && Number.isInteger(value) && value >= 1 && value <= 12 ? value : null;
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
  // Search Term match. Folded (diacritic-stripped + lowercased) so ASCII
  // queries like "Bunkyo" match macron'd romaji like "Bunkyō" — same
  // normalization /search already applies via lib/search.ts's `fold`.
  if (filters.searchQuery) {
    const query = fold(filters.searchQuery);
    const nameMatch = fold(card.name_en).includes(query) || (card.name_ja ?? "").includes(query);
    const locMatch = fold(card.city ?? "").includes(query) || fold(card.prefecture.name_en).includes(query);
    const primaryDeityMatch =
      fold(card.primary_deity?.name_en ?? "").includes(query) || (card.primary_deity?.name_ja ?? "").includes(query);
    const deityKanjiMatch = card.deity_ja.some((k) => k.includes(query));
    const rankMatch = card.rank_codes.some((r) => fold(r).includes(query));
    const categoryMatch = card.categories.some(
      (c) => fold(c.name_en).includes(query) || (c.name_ja ?? "").includes(query),
    );
    if (!nameMatch && !locMatch && !primaryDeityMatch && !deityKanjiMatch && !rankMatch && !categoryMatch)
      return false;
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
  if (filters.region.length > 0 && !filters.region.includes(card.region.name_en)) return false;

  // Prefecture multi-match
  if (filters.prefecture.length > 0 && !filters.prefecture.includes(card.prefecture.name_en)) return false;

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
