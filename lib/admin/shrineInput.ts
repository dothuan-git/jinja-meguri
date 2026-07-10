import type { Store, EditCatalogs } from "@/lib/types";
import type { ShrineInput } from "@/lib/admin/shrineContract";

/**
 * Build the editable `ShrineInput` for a shrine directly from the **raw Store
 * rows** — carrying BOTH languages (`*` + `*_ja`). This deliberately does NOT go
 * through the localized `ShrineDetail` view model: that would collapse the two
 * languages into one (locale-picked) value and, on save, write the displayed
 * language back into the English columns. Returns null if the slug isn't found.
 */
export function buildShrineInput(store: Store, slug: string): ShrineInput | null {
  const s = store.shrines.find((x) => x.slug === slug);
  if (!s) return null;

  const region = store.regions.find((r) => r.id === s.region_id);
  const pref = store.prefectures.find((p) => p.id === s.prefecture_id);
  const detail = store.shrine_details.find((d) => d.shrine_id === s.id) ?? null;
  const deityById = new Map(store.deities.map((d) => [d.id, d]));

  return {
    slug: s.slug,
    name_en: s.name_en,
    name_ja: s.name_ja,
    region: region?.name_en ?? "",
    prefecture: pref?.name_en ?? "",
    city: s.city,
    city_ja: s.city_ja,
    address: s.address,
    address_ja: s.address_ja,
    coordinates: s.coordinates,
    image_urls: s.image_urls ?? [],
    details: {
      history: detail?.history ?? null,
      history_ja: detail?.history_ja ?? null,
      description: detail?.description ?? null,
      description_ja: detail?.description_ja ?? null,
      prayer_focus: detail?.prayer_focus ?? null,
      prayer_focus_ja: detail?.prayer_focus_ja ?? null,
      best_time: detail?.best_time ?? null,
      best_time_ja: detail?.best_time_ja ?? null,
      quote: detail?.quote ?? null,
      quote_ja: detail?.quote_ja ?? null,
      geographic_notes: detail?.geographic_notes ?? null,
      geographic_notes_ja: detail?.geographic_notes_ja ?? null,
    },
    highlights: store.shrine_highlights
      .filter((h) => h.shrine_id === s.id)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((h, i) => ({ title: h.title, title_ja: h.title_ja, body: h.body, body_ja: h.body_ja, sort_order: i })),
    ranks: store.shrine_ranks
      .filter((sr) => sr.shrine_id === s.id)
      .map((sr) => store.ranks.find((r) => r.id === sr.rank_id)?.name_en)
      .filter((n): n is string => !!n),
    prayer_categories: store.shrine_prayer_categories
      .filter((spc) => spc.shrine_id === s.id)
      .map((spc) => store.prayer_categories.find((c) => c.id === spc.category_id)?.name_en)
      .filter((n): n is string => !!n),
    deities: store.shrine_deities
      .filter((sd) => sd.shrine_id === s.id)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((sd) => ({
        name_ja: deityById.get(sd.deity_id)?.name_ja ?? "",
        is_primary: sd.is_primary,
        sort_order: sd.sort_order,
        regional_lore: sd.regional_lore,
        regional_lore_ja: sd.regional_lore_ja,
        alter_name_en: sd.alter_name_en,
        alter_name_ja: sd.alter_name_ja,
        alter_titles: sd.alter_titles,
        alter_titles_ja: sd.alter_titles_ja,
      })),
    festivals: store.festivals
      .filter((f) => f.shrine_id === s.id)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((f) => ({
        name_en: f.name_en,
        name_ja: f.name_ja,
        time_prose: f.time_prose,
        time_prose_ja: f.time_prose_ja,
        start_date: f.start_date,
        end_date: f.end_date,
        origin: f.origin,
        origin_ja: f.origin_ja,
        meaning: f.meaning,
        meaning_ja: f.meaning_ja,
        ritual: f.ritual,
        ritual_ja: f.ritual_ja,
        prayer: f.prayer,
        prayer_ja: f.prayer_ja,
        festival_type: f.festival_type as "spectacle" | "pilgrimage" | null,
        visitor_notes: f.visitor_notes,
        visitor_notes_ja: f.visitor_notes_ja,
        occurrences: [],
      })),
    sources: store.sources
      .filter((src) => src.shrine_id === s.id)
      .map((src) => ({ url: src.url, title: src.title, title_ja: src.title_ja })),
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
    city_ja: null,
    address: null,
    address_ja: null,
    coordinates: null,
    image_urls: [],
    details: {
      history: null, history_ja: null,
      description: null, description_ja: null,
      prayer_focus: null, prayer_focus_ja: null,
      best_time: null, best_time_ja: null,
      quote: null, quote_ja: null,
      geographic_notes: null, geographic_notes_ja: null,
    },
    highlights: [],
    ranks: [],
    prayer_categories: [],
    deities: [{
      name_ja: "", is_primary: true, sort_order: 0,
      regional_lore: null, regional_lore_ja: null,
      alter_name_en: null, alter_name_ja: null,
      alter_titles: null, alter_titles_ja: null,
    }],
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
        titles_ja: d.titles_ja,
        canonical_lore: d.canonical_lore,
        canonical_lore_ja: d.canonical_lore_ja,
        mythic_sphere: d.mythic_sphere,
        mythic_sphere_ja: d.mythic_sphere_ja,
      })),
  };
}
