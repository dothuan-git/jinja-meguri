import type { ShrineDetail } from "@/lib/types";
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
    },
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
