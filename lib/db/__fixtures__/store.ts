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
      { id: 10, name_en: "Ichinomiya", description: "Highest Provincial Shrine", description_ja: null, name_ja: "一宮", rank_order: 3 },
      { id: 11, name_en: "Sonsha", description: "Village Shrine", description_ja: null, name_ja: "村社", rank_order: 10 },
      { id: 12, name_en: "Shikinai-sha", description: "Engishiki-listed Shrine", description_ja: null, name_ja: "式内社", rank_order: 5 },
    ],
    prayer_categories: [
      { id: 1, name_en: "Matchmaking", name_ja: "縁結び", group_label: "Love & Family", group_label_ja: null },
      { id: 2, name_en: "Victory", name_ja: "勝運", group_label: "Fortune & Success", group_label_ja: null },
    ],
    deities: [
      { id: "deity-1", name_en: "Deity One", name_ja: "神一", name_hiragana: null, titles: ["Lord of the Sun", "Divine Ancestor"], titles_ja: null, deity_type: "mythological", canonical_lore: "canon-1", canonical_lore_ja: null, mythic_sphere: null, mythic_sphere_ja: null },
      { id: "deity-2", name_en: "Deity Two", name_ja: "神二", name_hiragana: null, titles: ["Guardian of the Sea"], titles_ja: null, deity_type: "mythological", canonical_lore: "canon-2", canonical_lore_ja: null, mythic_sphere: null, mythic_sphere_ja: null },
      { id: "deity-3", name_en: "Deity Three", name_ja: "神三", name_hiragana: null, titles: ["Unenshrined Spirit"], titles_ja: null, deity_type: "mythological", canonical_lore: "canon-3", canonical_lore_ja: null, mythic_sphere: null, mythic_sphere_ja: null },
    ],
    shrines: [
      { id: "shrine-a", slug: "a", name_en: "Shrine A", name_ja: "甲社", name_hiragana: null, prefecture_id: 1, region_id: 1, city: "Saitama", city_ja: null, address: "addr-a", address_ja: null, coordinates: { lat: 35.9, lng: 139.6 }, image_urls: null },
      { id: "shrine-b", slug: "b", name_en: "Shrine B", name_ja: "乙社", name_hiragana: null, prefecture_id: 2, region_id: 2, city: "Kyōto", city_ja: null, address: null, address_ja: null, coordinates: null, image_urls: null },
    ],
    shrine_deities: [
      { shrine_id: "shrine-a", deity_id: "deity-1", is_primary: true, sort_order: 1, regional_lore: "regional-1", regional_lore_ja: null, alter_name_en: "Alter One", alter_name_ja: "別名一", alter_titles: ["Shrine-Local Title"], alter_titles_ja: null },
      { shrine_id: "shrine-a", deity_id: "deity-2", is_primary: false, sort_order: 2, regional_lore: null, regional_lore_ja: null, alter_name_en: null, alter_name_ja: null, alter_titles: null, alter_titles_ja: null },
      { shrine_id: "shrine-b", deity_id: "deity-2", is_primary: true, sort_order: 1, regional_lore: null, regional_lore_ja: null, alter_name_en: null, alter_name_ja: null, alter_titles: null, alter_titles_ja: null },
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
      { shrine_id: "shrine-a", history: "hist-a", history_ja: null, description: "desc-a", description_ja: null, prayer_focus: "focus-a", prayer_focus_ja: null, best_time: "spring", best_time_ja: null, quote: "quote-a", quote_ja: null, geographic_notes: null, geographic_notes_ja: null },
      { shrine_id: "shrine-b", history: "hist-b", history_ja: null, description: "desc-b", description_ja: null, prayer_focus: "focus-b", prayer_focus_ja: null, best_time: "summer", best_time_ja: null, quote: "quote-b", quote_ja: null, geographic_notes: null, geographic_notes_ja: null },
    ],
    shrine_highlights: [
      { id: "hl-1", shrine_id: "shrine-a", title: "Couple Camphor (夫婦楠)", title_ja: null, body: "Two camphors bound by one rope.", body_ja: null, sort_order: 0 },
      { id: "hl-2", shrine_id: "shrine-a", title: "Ōmigokoro Poem-Slips (大御心)", title_ja: null, body: null, body_ja: null, sort_order: 1 },
    ],
    festivals: [
      { id: "festival-1", shrine_id: "shrine-a", name_en: "Grand Festival", name_ja: "大祭", name_hiragana: null, time_prose: "early August", time_prose_ja: null, start_date: "2026-07-30", end_date: "2026-08-02", origin: "o", origin_ja: null, meaning: "m", meaning_ja: null, ritual: "r", ritual_ja: null, prayer: "p", prayer_ja: null, festival_type: "spectacle", visitor_notes: "v", visitor_notes_ja: null, sort_order: 0 },
      { id: "festival-2", shrine_id: "shrine-b", name_en: "Lunar Rite", name_ja: "旧暦祭", name_hiragana: null, time_prose: "2nd Sunday of the 6th lunar month", time_prose_ja: null, start_date: null, end_date: null, origin: "o2", origin_ja: null, meaning: "m2", meaning_ja: null, ritual: "r2", ritual_ja: null, prayer: "p2", prayer_ja: null, festival_type: "pilgrimage", visitor_notes: "v2", visitor_notes_ja: null, sort_order: 0 },
    ],
    sources: [
      { id: "source-1", shrine_id: "shrine-a", url: "https://example.com/a", title: "A official", title_ja: null },
    ],
    festival_occurrences: [],
  };
}
