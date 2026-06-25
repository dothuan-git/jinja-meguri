import type { Store } from "@/lib/types";

// Two shrines:
//  A (slug "a"): region 1 / pref 1; ranks [highOrder=3, lowOrder=10]; cats [c1(g1), c2(g2)];
//     deities: primary D1 (regional_lore set), secondary D2 (canonical only);
//     festival F1 with a multi-day dated range spanning two months.
//  B (slug "b"): region 2 / pref 2; ranks [order=5]; cat [c1]; deity D2;
//     festival F2 with NO dates (fallback) + time_prose.
export function makeStore(): Store {
  return {
    regions: [
      { id: 1, name_en: "Kanto", name_ja: "関東" },
      { id: 2, name_en: "Kinki", name_ja: "近畿" },
    ],
    prefectures: [
      { id: 1, name_en: "Saitama", name_ja: "埼玉県", region_id: 1 },
      { id: 2, name_en: "Kyoto", name_ja: "京都府", region_id: 2 },
    ],
    ranks: [
      { id: 10, name_en: "Ichinomiya", description: "Highest Provincial Shrine", name_ja: "一宮", rank_order: 3 },
      { id: 11, name_en: "Sonsha", description: "Village Shrine", name_ja: "村社", rank_order: 10 },
      { id: 12, name_en: "Shikinai-sha", description: "Engishiki-listed Shrine", name_ja: "式内社", rank_order: 5 },
    ],
    prayer_categories: [
      { id: 1, name_en: "Matchmaking", name_ja: "縁結び", group_label: "Love & Family" },
      { id: 2, name_en: "Victory", name_ja: "勝運", group_label: "Fortune & Success" },
    ],
    deities: [
      { id: "deity-1", name_en: "Deity One", name_ja: "神一", titles: ["Lord of the Sun", "Divine Ancestor"], deity_type: "mythological", canonical_lore: "canon-1", mythic_sphere: null },
      { id: "deity-2", name_en: "Deity Two", name_ja: "神二", titles: ["Guardian of the Sea"], deity_type: "mythological", canonical_lore: "canon-2", mythic_sphere: null },
      { id: "deity-3", name_en: "Deity Three", name_ja: "神三", titles: ["Unenshrined Spirit"], deity_type: "mythological", canonical_lore: "canon-3", mythic_sphere: null },
    ],
    shrines: [
      { id: "shrine-a", slug: "a", name_en: "Shrine A", name_ja: "甲社", prefecture_id: 1, region_id: 1, city: "Saitama", address: "addr-a", coordinates: { lat: 35.9, lng: 139.6 }, image_urls: null },
      { id: "shrine-b", slug: "b", name_en: "Shrine B", name_ja: "乙社", prefecture_id: 2, region_id: 2, city: "Kyōto", address: null, coordinates: null, image_urls: null },
    ],
    shrine_deities: [
      { shrine_id: "shrine-a", deity_id: "deity-1", is_primary: true, sort_order: 1, regional_lore: "regional-1" },
      { shrine_id: "shrine-a", deity_id: "deity-2", is_primary: false, sort_order: 2, regional_lore: null },
      { shrine_id: "shrine-b", deity_id: "deity-2", is_primary: true, sort_order: 1, regional_lore: null },
    ],
    shrine_ranks: [
      { shrine_id: "shrine-a", rank_id: 10 },
      { shrine_id: "shrine-a", rank_id: 11 },
      { shrine_id: "shrine-b", rank_id: 12 },
    ],
    shrine_prayer_categories: [
      { shrine_id: "shrine-a", category_id: 1 },
      { shrine_id: "shrine-a", category_id: 2 },
      { shrine_id: "shrine-b", category_id: 1 },
    ],
    shrine_details: [
      { shrine_id: "shrine-a", history: "hist-a", description: "desc-a", prayer_focus: "focus-a", best_time: "spring", quote: "quote-a", geographic_notes: null },
      { shrine_id: "shrine-b", history: "hist-b", description: "desc-b", prayer_focus: "focus-b", best_time: "summer", quote: "quote-b", geographic_notes: null },
    ],
    festivals: [
      { id: "festival-1", shrine_id: "shrine-a", name_en: "Grand Festival", name_ja: "大祭", time_prose: "early August", start_date: "2026-07-30", end_date: "2026-08-02", origin: "o", meaning: "m", ritual: "r", prayer: "p", festival_type: "spectacle", visitor_notes: "v" },
      { id: "festival-2", shrine_id: "shrine-b", name_en: "Lunar Rite", name_ja: "旧暦祭", time_prose: "2nd Sunday of the 6th lunar month", start_date: null, end_date: null, origin: "o2", meaning: "m2", ritual: "r2", prayer: "p2", festival_type: "pilgrimage", visitor_notes: "v2" },
    ],
    sources: [
      { id: "source-1", shrine_id: "shrine-a", url: "https://example.com/a", title: "A official" },
    ],
    festival_occurrences: [],
  };
}
