import type { ShrineDetail, Store, EditCatalogs } from "@/lib/types";
import type { ShrineInput } from "@/lib/admin/shrineContract";

/**
 * Reconstruct the editable `ShrineInput` shape from a `ShrineDetail` view model so
 * the editor form (admin route and inline-on-detail-page) can be pre-filled from
 * the same rendered data. Single source of truth — keep both call sites using this.
 */
export function shrineDetailToInput(detail: ShrineDetail): ShrineInput {
  return {
    slug: detail.slug,
    name_en: detail.name_en,
    name_ja: detail.name_ja,
    region: detail.region,
    prefecture: detail.prefecture,
    city: detail.city,
    address: detail.address,
    coordinates: detail.coordinates,
    image_urls: detail.image_urls ?? [],
    details: {
      history: detail.details?.history,
      description: detail.details?.description,
      prayer_focus: detail.details?.prayer_focus,
      best_time: detail.details?.best_time,
      quote: detail.details?.quote,
      geographic_notes: detail.details?.geographic_notes,
    },
    highlights: detail.highlights.map((h, i) => ({ title: h.title, body: h.body, sort_order: i })),
    ranks: detail.ranks.map((r) => r.name_en),
    prayer_categories: detail.categories.map((c) => c.name_en),
    deities: detail.deities.map((d) => ({
      name_ja: d.name_ja ?? "",
      is_primary: d.is_primary,
      sort_order: d.sort_order,
      regional_lore: d.regional_lore,
    })),
    festivals: detail.festivals.map((f) => ({
      name_en: f.name_en,
      name_ja: f.name_ja,
      time_prose: f.time_prose,
      start_date: f.start_date,
      end_date: f.end_date,
      origin: f.origin,
      meaning: f.meaning,
      ritual: f.ritual,
      prayer: f.prayer,
      festival_type: f.festival_type as "spectacle" | "pilgrimage" | null,
      visitor_notes: f.visitor_notes,
      occurrences: [],
    })),
    sources: detail.sources.map((s) => ({ url: s.url, title: s.title })),
  };
}

/**
 * Empty draft seed for the create-on-detail-page flow: every field blank/null with a
 * single primary deity stub (the contract requires ≥1 deity, exactly one primary).
 */
export function emptyShrineInput(): ShrineInput {
  return {
    slug: "",
    name_en: "",
    name_ja: null,
    region: "",
    prefecture: "",
    city: null,
    address: null,
    coordinates: null,
    image_urls: [],
    details: { history: null, description: null, prayer_focus: null, best_time: null, quote: null, geographic_notes: null },
    highlights: [],
    ranks: [],
    prayer_categories: [],
    deities: [{ name_ja: "", is_primary: true, sort_order: 0, regional_lore: null }],
    festivals: [],
    sources: [],
  };
}

/**
 * Build the catalog option lists the in-place editor's dropdowns offer. Pure
 * derivation from the already-loaded {@link Store}; called only for admins so
 * these lists never ship to the public bundle.
 */
export function buildEditCatalogs(store: Store): EditCatalogs {
  const regionById = new Map(store.regions.map((r) => [r.id, r.name_en]));
  return {
    ranks: [...store.ranks]
      .sort((a, b) => a.rank_order - b.rank_order)
      .map((r) => r.name_en),
    prayerCategories: [...store.prayer_categories]
      .sort((a, b) => a.group_label.localeCompare(b.group_label) || a.name_en.localeCompare(b.name_en))
      .map((c) => c.name_en),
    prefectures: [...store.prefectures]
      .sort((a, b) => a.name_en.localeCompare(b.name_en))
      .map((p) => ({ name_en: p.name_en, region: regionById.get(p.region_id) ?? "" })),
    // Selectable deities for the create-flow picker (keyed on name_ja, the dedup key).
    deities: [...store.deities]
      .filter((d) => d.name_ja)
      .sort((a, b) => a.name_en.localeCompare(b.name_en))
      .map((d) => ({
        id: d.id,
        name_en: d.name_en,
        name_ja: d.name_ja,
        deity_type: d.deity_type,
        titles: d.titles ?? [],
        canonical_lore: d.canonical_lore,
        mythic_sphere: d.mythic_sphere,
      })),
  };
}
