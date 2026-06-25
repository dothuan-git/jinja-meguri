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
  FestivalView,
  FacetCatalogs,
  Prefecture,
  CalendarFestival,
  DeityListItem,
  DeityShrineLink,
} from "@/lib/types";
import { pickHighestRankId } from "@/lib/db/derive";
import { resolveCalendarDates } from "@/lib/calendar";

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
  };
}

function shrineRankViews(idx: StoreIndex, shrineId: string): RankView[] {
  const ranks = (idx.ranksByShrine.get(shrineId) ?? [])
    .map((sr) => idx.rankById.get(sr.rank_id)!)
    .filter(Boolean);
  const highestId = pickHighestRankId(ranks);
  return ranks
    .map((r) => ({
      name_en: r.name_en,
      description: r.description,
      name_ja: r.name_ja,
      rank_order: r.rank_order,
      is_highest: r.id === highestId,
    }))
    .sort((a, b) => a.rank_order - b.rank_order);
}

function shrineCategoryViews(idx: StoreIndex, shrineId: string): CategoryView[] {
  return (idx.catsByShrine.get(shrineId) ?? [])
    .map((spc) => idx.catById.get(spc.category_id)!)
    .filter(Boolean)
    .map((c) => ({ name_en: c.name_en, name_ja: c.name_ja, group_label: c.group_label }));
}

function shrineDeityViews(idx: StoreIndex, shrineId: string): DeityView[] {
  return (idx.deitiesByShrine.get(shrineId) ?? [])
    .map((sd) => {
      const d = idx.deityById.get(sd.deity_id)!;
      return {
        id: d.id,
        name_en: d.name_en,
        name_ja: d.name_ja,
        titles: d.titles ?? [],
        deity_type: d.deity_type,
        canonical_lore: d.canonical_lore,
        regional_lore: sd.regional_lore,
        is_primary: sd.is_primary,
        sort_order: sd.sort_order,
      };
    })
    .sort((a, b) => a.sort_order - b.sort_order);
}

function buildCard(idx: StoreIndex, s: ShrineRow): ShrineCard {
  const region = idx.regionById.get(s.region_id);
  const pref = idx.prefById.get(s.prefecture_id);
  const ranks = shrineRankViews(idx, s.id);
  const categories = shrineCategoryViews(idx, s.id);
  const deities = shrineDeityViews(idx, s.id);
  const primary = deities.find((d) => d.is_primary) ?? null;
  const detailRow = idx.detailByShrine.get(s.id) ?? null;
  return {
    slug: s.slug,
    name_en: s.name_en,
    name_ja: s.name_ja,
    city: s.city,
    prefecture: pref?.name_en ?? "",
    region: region?.name_en ?? "",
    primary_deity: primary ? { name_en: primary.name_en, name_ja: primary.name_ja } : null,
    categories,
    highest_rank: ranks.find((r) => r.is_highest) ?? null,
    region_id: s.region_id,
    prefecture_id: s.prefecture_id,
    rank_codes: ranks.map((r) => r.name_en),
    category_codes: categories.map((c) => c.name_en),
    deity_ja: deities.map((d) => d.name_ja).filter((k): k is string => !!k),
    prayer_focus: detailRow?.prayer_focus ?? null,
    best_time: detailRow?.best_time ?? null,
    primary_deity_titles: primary?.titles ?? [],
  };
}

export function getShrineCards(store: Store): ShrineCard[] {
  const idx = buildIndex(store);
  return store.shrines.map((s) => buildCard(idx, s)).sort((a, b) => a.name_en.localeCompare(b.name_en));
}

export function getAllSlugs(store: Store): string[] {
  return store.shrines.map((s) => s.slug);
}

export function getShrineDetail(store: Store, slug: string): ShrineDetail | null {
  const s = store.shrines.find((x) => x.slug === slug);
  if (!s) return null;
  const idx = buildIndex(store);
  const card = buildCard(idx, s);
  const detailRow = idx.detailByShrine.get(s.id) ?? null;
  const festivals: FestivalView[] = store.festivals
    .filter((f) => f.shrine_id === s.id)
    .map((f) => ({
      id: f.id,
      name_en: f.name_en,
      name_ja: f.name_ja,
      time_prose: f.time_prose,
      start_date: f.start_date,
      end_date: f.end_date,
      origin: f.origin,
      meaning: f.meaning,
      ritual: f.ritual,
      prayer: f.prayer,
      festival_type: f.festival_type,
      visitor_notes: f.visitor_notes,
    }));
  return {
    ...card,
    address: s.address,
    coordinates: s.coordinates,
    image_urls: s.image_urls,
    deities: shrineDeityViews(idx, s.id),
    ranks: shrineRankViews(idx, s.id),
    details: detailRow
      ? {
          history: detailRow.history,
          description: detailRow.description,
          prayer_focus: detailRow.prayer_focus,
          best_time: detailRow.best_time,
          quote: detailRow.quote,
        }
      : null,
    festivals,
    sources: store.sources.filter((src) => src.shrine_id === s.id),
  };
}

export function getFestivalYear(store: Store, year: number): CalendarFestival[] {
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
      shrine_city: s.city,
      shrine_prefecture: pref?.name_en ?? "",
      shrine_region: region?.name_en ?? "",
      region_id: s.region_id,
      festival_name_en: f.name_en,
      festival_name_ja: f.name_ja,
      festival_type: f.festival_type,
      time_prose: f.time_prose,
      start_date: startDate,
      end_date: endDate,
      month,
      meaning: f.meaning,
      ritual: f.ritual,
      prayer: f.prayer,
      visitor_notes: f.visitor_notes,
      origin: f.origin,
      is_fallback,
    };
  });
}

export function getDeityList(store: Store): DeityListItem[] {
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
          city: s.city,
          prefecture: pref?.name_en ?? "",
          region: region?.name_en ?? "",
          is_primary: sd.is_primary,
          regional_lore: sd.regional_lore,
        };
      })
      .sort((a, b) => Number(b.is_primary) - Number(a.is_primary));
    return {
      id: d.id,
      name_en: d.name_en,
      name_ja: d.name_ja,
      titles: d.titles ?? [],
      deity_type: d.deity_type,
      canonical_lore: d.canonical_lore,
      mythic_sphere: d.mythic_sphere,
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

export function getFacetCatalogs(store: Store): FacetCatalogs {
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
    .map((r) => ({ name_en: r.name_en, description: r.description, name_ja: r.name_ja, rank_order: r.rank_order, is_highest: false }));

  const prefecturesByRegion: Record<number, Prefecture[]> = {};
  for (const p of store.prefectures) {
    (prefecturesByRegion[p.region_id] ??= []).push(p);
  }

  const deityById = index(store.deities);
  const deityJaInUse = new Map<string, { name_en: string; name_ja: string }>();
  for (const sd of store.shrine_deities) {
    const d = deityById.get(sd.deity_id);
    if (d?.name_ja) deityJaInUse.set(d.name_ja, { name_en: d.name_en, name_ja: d.name_ja });
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
