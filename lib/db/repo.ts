import type {
  Store,
  ShrineCard,
  ShrineDetail,
  RankView,
  CategoryView,
  DeityView,
  FestivalView,
  FacetCatalogs,
  Prefecture,
} from "@/lib/types";
import { pickHighestRankId } from "@/lib/db/derive";

function index<T extends { id: string | number }>(rows: T[]): Map<T["id"], T> {
  return new Map(rows.map((r) => [r.id, r]));
}

function shrineRankViews(store: Store, shrineId: string): RankView[] {
  const byId = index(store.ranks);
  const ranks = store.shrine_ranks
    .filter((sr) => sr.shrine_id === shrineId)
    .map((sr) => byId.get(sr.rank_id)!)
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

function shrineCategoryViews(store: Store, shrineId: string): CategoryView[] {
  const byId = index(store.prayer_categories);
  return store.shrine_prayer_categories
    .filter((spc) => spc.shrine_id === shrineId)
    .map((spc) => byId.get(spc.category_id)!)
    .filter(Boolean)
    .map((c) => ({ name_en: c.name_en, name_ja: c.name_ja, group_label: c.group_label }));
}

function shrineDeityViews(store: Store, shrineId: string): DeityView[] {
  const byId = index(store.deities);
  return store.shrine_deities
    .filter((sd) => sd.shrine_id === shrineId)
    .map((sd) => {
      const d = byId.get(sd.deity_id)!;
      return {
        id: d.id,
        name_en: d.name_en,
        name_ja: d.name_ja,
        titles: d.titles ?? [],
        role: sd.role,
        deity_type: d.deity_type,
        canonical_lore: d.canonical_lore,
        regional_lore: sd.regional_lore,
        is_primary: sd.is_primary,
        sort_order: sd.sort_order,
      };
    })
    .sort((a, b) => a.sort_order - b.sort_order);
}

function buildCard(store: Store, shrineId: string): ShrineCard {
  const s = store.shrines.find((x) => x.id === shrineId)!;
  const region = store.regions.find((r) => r.id === s.region_id);
  const pref = store.prefectures.find((p) => p.id === s.prefecture_id);
  const ranks = shrineRankViews(store, shrineId);
  const categories = shrineCategoryViews(store, shrineId);
  const deities = shrineDeityViews(store, shrineId);
  const primary = deities.find((d) => d.is_primary) ?? null;
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
  };
}

export function getShrineCards(store: Store): ShrineCard[] {
  return store.shrines.map((s) => buildCard(store, s.id)).sort((a, b) => a.name_en.localeCompare(b.name_en));
}

export function getAllSlugs(store: Store): string[] {
  return store.shrines.map((s) => s.slug);
}

export function getShrineDetail(store: Store, slug: string): ShrineDetail | null {
  const s = store.shrines.find((x) => x.slug === slug);
  if (!s) return null;
  const card = buildCard(store, s.id);
  const detailRow = store.shrine_details.find((d) => d.shrine_id === s.id) ?? null;
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
    notes: s.notes,
    deities: shrineDeityViews(store, s.id),
    ranks: shrineRankViews(store, s.id),
    details: detailRow
      ? {
          history: detailRow.history,
          description: detailRow.description,
          prayer_focus: detailRow.prayer_focus,
          best_time: detailRow.best_time,
        }
      : null,
    festivals,
    sources: store.sources.filter((src) => src.shrine_id === s.id),
  };
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

  const deityJaInUse = new Map<string, { name_en: string; name_ja: string }>();
  for (const sd of store.shrine_deities) {
    const d = store.deities.find((x) => x.id === sd.deity_id);
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
