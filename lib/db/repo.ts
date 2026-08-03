import type {
  Store,
  ShrineRow,
  ShrineDeityRow,
  ShrineRankRow,
  ShrinePrayerCategoryRow,
  ShrineDetailRow,
  Region,
  Rank,
  PrayerCategory,
  Deity,
  ShrineCard,
  ShrineDetail,
  RankView,
  CategoryView,
  DeityView,
  FestivalBrief,
  FestivalView,
  FacetCatalogs,
  Prefecture,
  CalendarFestival,
  DeityListItem,
  DeityShrineLink,
  FestivalRow,
  FestivalOccurrenceRow,
} from "@/lib/types";
import { pickHighestRankId } from "@/lib/db/derive";
import { resolveCalendarDates } from "@/lib/calendar";
import type { Locale } from "@/lib/i18n";
import { DEFAULT_LOCALE } from "@/lib/i18n";

// Locale-picked prose: return the JA value when it exists and the locale is "ja",
// else fall back to the English value. Never element-wise for arrays — see locArr.
function loc(locale: Locale, en: string | null, ja: string | null): string | null {
  return locale === "ja" ? (ja ?? en) : en;
}
// Whole-array fallback: an empty/null `ja` array falls back to the entire `en`
// array (we never mix translated + untranslated elements).
function locArr(locale: Locale, en: string[] | null, ja: string[] | null): string[] | null {
  if (locale === "ja" && ja && ja.length > 0) return ja;
  return en;
}

function index<T extends { id: string | number }>(rows: T[]): Map<T["id"], T> {
  return new Map(rows.map((r) => [r.id, r]));
}

function groupBy<T, K>(rows: T[], key: (row: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const row of rows) {
    const k = key(row);
    const bucket = map.get(k);
    if (bucket) bucket.push(row);
    else map.set(k, [row]);
  }
  return map;
}

/**
 * Lookup tables built once per assembly pass so the per-shrine helpers below do
 * O(1) map lookups instead of re-scanning (and re-indexing) the full join tables
 * for every shrine — which made `getShrineCards` quadratic in the shrine count.
 */
type StoreIndex = {
  rankById: Map<number, Rank>;
  catById: Map<number, PrayerCategory>;
  deityById: Map<string, Deity>;
  regionById: Map<number, Region>;
  prefById: Map<number, Prefecture>;
  ranksByShrine: Map<string, ShrineRankRow[]>;
  catsByShrine: Map<string, ShrinePrayerCategoryRow[]>;
  deitiesByShrine: Map<string, ShrineDeityRow[]>;
  detailByShrine: Map<string, ShrineDetailRow>;
  festivalsByShrine: Map<string, FestivalRow[]>;
  occsByFestival: Map<string, FestivalOccurrenceRow[]>;
};

function buildIndex(store: Store): StoreIndex {
  return {
    rankById: index(store.ranks),
    catById: index(store.prayer_categories),
    deityById: index(store.deities),
    regionById: index(store.regions),
    prefById: index(store.prefectures),
    ranksByShrine: groupBy(store.shrine_ranks, (sr) => sr.shrine_id),
    catsByShrine: groupBy(store.shrine_prayer_categories, (spc) => spc.shrine_id),
    deitiesByShrine: groupBy(store.shrine_deities, (sd) => sd.shrine_id),
    detailByShrine: new Map(store.shrine_details.map((d) => [d.shrine_id, d])),
    festivalsByShrine: groupBy(store.festivals, (f) => f.shrine_id),
    occsByFestival: groupBy(store.festival_occurrences, (o) => o.festival_id),
  };
}

// Every month (1-12) touched by a `YYYY-MM-DD` span. When the end month is
// earlier than the start month the span crosses New Year, so it wraps
// (e.g. 12-28 → 01-03 yields {12, 1}).
function monthsInSpan(start: string, end: string | null): number[] {
  const startM = Number(start.slice(5, 7));
  const endM = end ? Number(end.slice(5, 7)) : startM;
  const months: number[] = [];
  if (endM >= startM) {
    for (let m = startM; m <= endM; m++) months.push(m);
  } else {
    for (let m = startM; m <= 12; m++) months.push(m);
    for (let m = 1; m <= endM; m++) months.push(m);
  }
  return months;
}

// Year-agnostic set of months a shrine's festivals fall in. Fixed-date
// festivals use their stored start/end; lunar / Nth-weekday festivals (no
// stored date) fall back to the union of their recorded occurrences.
function shrineFestivalMonths(idx: StoreIndex, shrineId: string): number[] {
  const months = new Set<number>();
  for (const f of idx.festivalsByShrine.get(shrineId) ?? []) {
    if (f.start_date) {
      monthsInSpan(f.start_date, f.end_date).forEach((m) => months.add(m));
    } else {
      for (const o of idx.occsByFestival.get(f.id) ?? []) {
        monthsInSpan(o.start_date, o.end_date).forEach((m) => months.add(m));
      }
    }
  }
  return [...months].sort((a, b) => a - b);
}

const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Compact "when" label for the map popup: prefer the human time_prose, else a
// month-day span from the fixed start/end dates, else null. JA uses `7月30日`.
function festivalWhen(f: FestivalRow, locale: Locale): string | null {
  const prose = loc(locale, f.time_prose, f.time_prose_ja);
  if (prose) return prose;
  if (!f.start_date) return null;
  const dayLabel = (d: string) => {
    const m = Number(d.slice(5, 7));
    const day = Number(d.slice(8, 10));
    return locale === "ja" ? `${m}月${day}日` : `${MONTH_ABBR[m - 1]} ${day}`;
  };
  const start = dayLabel(f.start_date);
  return f.end_date && f.end_date !== f.start_date ? `${start} – ${dayLabel(f.end_date)}` : start;
}

function shrineFestivalsBrief(idx: StoreIndex, shrineId: string, locale: Locale): FestivalBrief[] {
  return [...(idx.festivalsByShrine.get(shrineId) ?? [])]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((f) => ({ name_en: f.name_en, name_ja: f.name_ja, name_hiragana: f.name_hiragana, when: festivalWhen(f, locale) }));
}

function shrineRankViews(idx: StoreIndex, shrineId: string, locale: Locale): RankView[] {
  const ranks = (idx.ranksByShrine.get(shrineId) ?? [])
    .map((sr) => idx.rankById.get(sr.rank_id)!)
    .filter(Boolean);
  const highestId = pickHighestRankId(ranks);
  return ranks
    .map((r) => ({
      name_en: r.name_en,
      description: loc(locale, r.description, r.description_ja),
      name_ja: r.name_ja,
      rank_order: r.rank_order,
      is_highest: r.id === highestId,
    }))
    .sort((a, b) => a.rank_order - b.rank_order);
}

function shrineCategoryViews(idx: StoreIndex, shrineId: string, locale: Locale): CategoryView[] {
  return (idx.catsByShrine.get(shrineId) ?? [])
    .map((spc) => idx.catById.get(spc.category_id)!)
    .filter(Boolean)
    // group_label stays the EN facet key; group_label_ja is display-only elsewhere.
    .map((c) => ({ name_en: c.name_en, name_ja: c.name_ja, group_label: c.group_label }));
}

function shrineDeityViews(idx: StoreIndex, shrineId: string, locale: Locale): DeityView[] {
  return (idx.deitiesByShrine.get(shrineId) ?? [])
    .map((sd) => {
      const d = idx.deityById.get(sd.deity_id)!;
      return {
        id: d.id,
        name_en: d.name_en,
        name_ja: d.name_ja,
        name_hiragana: d.name_hiragana,
        titles: locArr(locale, d.titles, d.titles_ja) ?? [],
        deity_type: d.deity_type,
        canonical_lore: loc(locale, d.canonical_lore, d.canonical_lore_ja),
        regional_lore: loc(locale, sd.regional_lore, sd.regional_lore_ja),
        alter_name_en: sd.alter_name_en,
        alter_name_ja: sd.alter_name_ja,
        alter_titles: locArr(locale, sd.alter_titles, sd.alter_titles_ja),
        is_primary: sd.is_primary,
        sort_order: sd.sort_order,
      };
    })
    .sort((a, b) => a.sort_order - b.sort_order);
}

function buildCard(idx: StoreIndex, s: ShrineRow, locale: Locale): ShrineCard {
  const region = idx.regionById.get(s.region_id);
  const pref = idx.prefById.get(s.prefecture_id);
  const ranks = shrineRankViews(idx, s.id, locale);
  const categories = shrineCategoryViews(idx, s.id, locale);
  const deities = shrineDeityViews(idx, s.id, locale);
  const primary = deities.find((d) => d.is_primary) ?? null;
  const detailRow = idx.detailByShrine.get(s.id) ?? null;
  return {
    slug: s.slug,
    name_en: s.name_en,
    name_ja: s.name_ja,
    name_hiragana: s.name_hiragana,
    city: loc(locale, s.city, s.city_ja),
    prefecture: { name_en: pref?.name_en ?? "", name_ja: pref?.name_ja ?? null },
    region: { name_en: region?.name_en ?? "", name_ja: region?.name_ja ?? null },
    // Lead with the shrine's alternate (enshrined) name when set, else canonical.
    // An alternate name has no stored hiragana — alter_name_en is already a
    // display-ready form, so name_hiragana is nulled and namePair falls back to it.
    primary_deity: primary
      ? {
          name_en: primary.alter_name_en || primary.name_en,
          name_ja: primary.alter_name_ja || primary.name_ja,
          name_hiragana: primary.alter_name_en ? null : primary.name_hiragana,
        }
      : null,
    categories,
    ranks,
    highest_rank: ranks.find((r) => r.is_highest) ?? null,
    coordinates: s.coordinates,
    region_id: s.region_id,
    prefecture_id: s.prefecture_id,
    rank_codes: ranks.map((r) => r.name_en),
    category_codes: categories.map((c) => c.name_en),
    deity_ja: deities.map((d) => d.name_ja).filter((k): k is string => !!k),
    festival_months: shrineFestivalMonths(idx, s.id),
    festivals_brief: shrineFestivalsBrief(idx, s.id, locale),
    prayer_focus: loc(locale, detailRow?.prayer_focus ?? null, detailRow?.prayer_focus_ja ?? null),
    best_time: loc(locale, detailRow?.best_time ?? null, detailRow?.best_time_ja ?? null),
    primary_deity_titles: (primary?.alter_titles ?? primary?.titles) ?? [],
  };
}

export function getShrineCards(store: Store, locale: Locale = DEFAULT_LOCALE): ShrineCard[] {
  const idx = buildIndex(store);
  return store.shrines.map((s) => buildCard(idx, s, locale)).sort((a, b) => a.name_en.localeCompare(b.name_en));
}

export function getAllSlugs(store: Store): string[] {
  return store.shrines.map((s) => s.slug);
}

export function getShrineDetail(store: Store, slug: string, locale: Locale = DEFAULT_LOCALE): ShrineDetail | null {
  const s = store.shrines.find((x) => x.slug === slug);
  if (!s) return null;
  const idx = buildIndex(store);
  const card = buildCard(idx, s, locale);
  const detailRow = idx.detailByShrine.get(s.id) ?? null;
  const festivals: FestivalView[] = store.festivals
    .filter((f) => f.shrine_id === s.id)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((f) => ({
      id: f.id,
      name_en: f.name_en,
      name_ja: f.name_ja,
      name_hiragana: f.name_hiragana,
      time_prose: loc(locale, f.time_prose, f.time_prose_ja),
      start_date: f.start_date,
      end_date: f.end_date,
      origin: loc(locale, f.origin, f.origin_ja),
      meaning: loc(locale, f.meaning, f.meaning_ja),
      ritual: loc(locale, f.ritual, f.ritual_ja),
      prayer: loc(locale, f.prayer, f.prayer_ja),
      festival_type: f.festival_type,
      visitor_notes: loc(locale, f.visitor_notes, f.visitor_notes_ja),
    }));
  return {
    ...card,
    address: loc(locale, s.address, s.address_ja),
    image_urls: s.image_urls,
    deities: shrineDeityViews(idx, s.id, locale),
    ranks: shrineRankViews(idx, s.id, locale),
    details: detailRow
      ? {
          history: loc(locale, detailRow.history, detailRow.history_ja),
          description: loc(locale, detailRow.description, detailRow.description_ja),
          prayer_focus: loc(locale, detailRow.prayer_focus, detailRow.prayer_focus_ja),
          best_time: loc(locale, detailRow.best_time, detailRow.best_time_ja),
          quote: loc(locale, detailRow.quote, detailRow.quote_ja),
          geographic_notes: loc(locale, detailRow.geographic_notes, detailRow.geographic_notes_ja),
        }
      : null,
    highlights: store.shrine_highlights
      .filter((h) => h.shrine_id === s.id)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((h) => ({ title: loc(locale, h.title, h.title_ja) ?? h.title, body: loc(locale, h.body, h.body_ja) })),
    festivals,
    sources: store.sources
      .filter((src) => src.shrine_id === s.id)
      .map((src) => ({ ...src, title: loc(locale, src.title, src.title_ja) })),
  };
}

export function getFestivalYear(store: Store, year: number, locale: Locale = DEFAULT_LOCALE): CalendarFestival[] {
  const shrineById = index(store.shrines);
  const regionById = index(store.regions);
  const prefById = index(store.prefectures);
  const occByFestival = new Map(
    store.festival_occurrences.filter((o) => o.year === year).map((o) => [o.festival_id, o]),
  );
  return store.festivals.map((f) => {
    const s = shrineById.get(f.shrine_id)!;
    const region = regionById.get(s.region_id);
    const pref = prefById.get(s.prefecture_id);
    const occ = occByFestival.get(f.id);
    const { start_date: startDate, end_date: endDate, is_fallback } = resolveCalendarDates(occ, f, year);
    const month = startDate ? Number(startDate.slice(5, 7)) : null;
    return {
      festival_id: f.id,
      shrine_slug: s.slug,
      shrine_name_en: s.name_en,
      shrine_name_ja: s.name_ja,
      shrine_name_hiragana: s.name_hiragana,
      shrine_city: loc(locale, s.city, s.city_ja),
      shrine_prefecture: { name_en: pref?.name_en ?? "", name_ja: pref?.name_ja ?? null },
      shrine_region: { name_en: region?.name_en ?? "", name_ja: region?.name_ja ?? null },
      region_id: s.region_id,
      festival_name_en: f.name_en,
      festival_name_ja: f.name_ja,
      festival_name_hiragana: f.name_hiragana,
      festival_type: f.festival_type,
      time_prose: loc(locale, f.time_prose, f.time_prose_ja),
      start_date: startDate,
      end_date: endDate,
      month,
      meaning: loc(locale, f.meaning, f.meaning_ja),
      ritual: loc(locale, f.ritual, f.ritual_ja),
      prayer: loc(locale, f.prayer, f.prayer_ja),
      visitor_notes: loc(locale, f.visitor_notes, f.visitor_notes_ja),
      origin: loc(locale, f.origin, f.origin_ja),
      is_fallback,
    };
  });
}

export function getDeityList(store: Store, locale: Locale = DEFAULT_LOCALE): DeityListItem[] {
  const shrineById = index(store.shrines);
  const regionById = index(store.regions);
  const prefById = index(store.prefectures);
  const linksByDeity = groupBy(store.shrine_deities, (sd) => sd.deity_id);
  const items: DeityListItem[] = store.deities.map((d) => {
    const links: DeityShrineLink[] = (linksByDeity.get(d.id) ?? [])
      .map((sd) => {
        const s = shrineById.get(sd.shrine_id)!;
        const region = regionById.get(s.region_id);
        const pref = prefById.get(s.prefecture_id);
        return {
          slug: s.slug,
          name_en: s.name_en,
          name_ja: s.name_ja,
          name_hiragana: s.name_hiragana,
          city: loc(locale, s.city, s.city_ja),
          prefecture: { name_en: pref?.name_en ?? "", name_ja: pref?.name_ja ?? null },
          region: { name_en: region?.name_en ?? "", name_ja: region?.name_ja ?? null },
          is_primary: sd.is_primary,
          regional_lore: loc(locale, sd.regional_lore, sd.regional_lore_ja),
        };
      })
      .sort((a, b) => Number(b.is_primary) - Number(a.is_primary));
    return {
      id: d.id,
      name_en: d.name_en,
      name_ja: d.name_ja,
      name_hiragana: d.name_hiragana,
      titles: locArr(locale, d.titles, d.titles_ja) ?? [],
      deity_type: d.deity_type,
      canonical_lore: loc(locale, d.canonical_lore, d.canonical_lore_ja),
      mythic_sphere: loc(locale, d.mythic_sphere, d.mythic_sphere_ja),
      shrines: links,
    };
  });
  // Amaterasu/Inari first then alpha; deities with no shrine links still show
  return items
    .sort((a, b) => {
      const rank = (n: string) => (n.includes("Amaterasu") ? 0 : n.includes("Inari") ? 1 : 2);
      const ra = rank(a.name_en), rb = rank(b.name_en);
      return ra !== rb ? ra - rb : a.name_en.localeCompare(b.name_en);
    });
}

export function getFacetCatalogs(store: Store, locale: Locale = DEFAULT_LOCALE): FacetCatalogs {
  // group_label stays the EN grouping key (stable facet identity); the localized
  // group_label_ja is display-only and not surfaced through CategoryView here.
  const groupsMap = new Map<string, CategoryView[]>();
  for (const c of store.prayer_categories) {
    const v: CategoryView = { name_en: c.name_en, name_ja: c.name_ja, group_label: c.group_label };
    if (!groupsMap.has(c.group_label)) groupsMap.set(c.group_label, []);
    groupsMap.get(c.group_label)!.push(v);
  }
  const categoryGroups = [...groupsMap.entries()].map(([group_label, categories]) => ({ group_label, categories }));

  const rankIdsInUse = new Set(store.shrine_ranks.map((sr) => sr.rank_id));
  const ranks: RankView[] = store.ranks
    .filter((r) => rankIdsInUse.has(r.id))
    .sort((a, b) => a.rank_order - b.rank_order)
    .map((r) => ({ name_en: r.name_en, description: loc(locale, r.description, r.description_ja), name_ja: r.name_ja, rank_order: r.rank_order, is_highest: false }));

  const prefecturesByRegion: Record<number, Prefecture[]> = {};
  for (const p of store.prefectures) {
    (prefecturesByRegion[p.region_id] ??= []).push(p);
  }

  const deityById = index(store.deities);
  const deityJaInUse = new Map<string, { name_en: string; name_ja: string; name_hiragana: string | null }>();
  for (const sd of store.shrine_deities) {
    const d = deityById.get(sd.deity_id);
    if (d?.name_ja) deityJaInUse.set(d.name_ja, { name_en: d.name_en, name_ja: d.name_ja, name_hiragana: d.name_hiragana });
  }

  const regionIdsInUse = new Set(store.shrines.map((s) => s.region_id));
  return {
    categoryGroups,
    ranks,
    regions: store.regions.filter((r) => regionIdsInUse.has(r.id)),
    prefecturesByRegion,
    deities: [...deityJaInUse.values()].sort((a, b) => a.name_en.localeCompare(b.name_en)),
  };
}
