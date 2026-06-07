import type { Store } from "@/lib/types";

// Two shrines:
//  A (slug "a"): region 1 / pref 1; ranks [highOrder=3, lowOrder=10]; cats [c1(g1), c2(g2)];
//     deities: primary D1 (regional_lore set), secondary D2 (canonical only);
//     event E1 with one multi-day occurrence spanning two months.
//  B (slug "b"): region 2 / pref 2; ranks [order=5]; cat [c1]; deity D2;
//     event E2 with NO occurrences (fallback) + time_prose.
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
      { id: 10, code: "Ichinomiya", name_en: "Highest Provincial Shrine", name_ja: "一宮", rank_order: 3 },
      { id: 11, code: "Sonsha", name_en: "Village Shrine", name_ja: "村社", rank_order: 10 },
      { id: 12, code: "Shikinai-sha", name_en: "Engishiki-listed Shrine", name_ja: "式内社", rank_order: 5 },
    ],
    prayer_categories: [
      { id: 1, code: "Matchmaking", name_en: "Matchmaking", name_ja: "縁結び", group_label: "Love & Family" },
      { id: 2, code: "Victory", name_en: "Victory", name_ja: "勝運", group_label: "Fortune & Success" },
    ],
    deities: [
      { id: 1, name_romaji: "Deity One", name_kanji: "神一", domain: "d1", title: null, deity_type: "origin", canonical_lore: "canon-1" },
      { id: 2, name_romaji: "Deity Two", name_kanji: "神二", domain: "d2", title: null, deity_type: "origin", canonical_lore: "canon-2" },
    ],
    shrines: [
      { id: 1, slug: "a", name_en: "Shrine A", name_ja: "甲社", prefecture_id: 1, region_id: 1, city: "Saitama", address: "addr-a", coordinates: { lat: 35.9, lng: 139.6 }, notes: null },
      { id: 2, slug: "b", name_en: "Shrine B", name_ja: "乙社", prefecture_id: 2, region_id: 2, city: "Kyoto", address: null, coordinates: null, notes: null },
    ],
    shrine_deities: [
      { shrine_id: 1, deity_id: 1, is_primary: true, sort_order: 1, role: "principal", regional_lore: "regional-1" },
      { shrine_id: 1, deity_id: 2, is_primary: false, sort_order: 2, role: "consort", regional_lore: null },
      { shrine_id: 2, deity_id: 2, is_primary: true, sort_order: 1, role: "principal", regional_lore: null },
    ],
    shrine_ranks: [
      { shrine_id: 1, rank_id: 10 },
      { shrine_id: 1, rank_id: 11 },
      { shrine_id: 2, rank_id: 12 },
    ],
    shrine_prayer_categories: [
      { shrine_id: 1, category_id: 1 },
      { shrine_id: 1, category_id: 2 },
      { shrine_id: 2, category_id: 1 },
    ],
    shrine_details: [
      { shrine_id: 1, history: "hist-a", why_visit: "why-a", prayer_focus: "focus-a", best_season: "spring" },
      { shrine_id: 2, history: "hist-b", why_visit: "why-b", prayer_focus: "focus-b", best_season: "summer" },
    ],
    events: [
      { id: 1, shrine_id: 1, name_en: "Grand Festival", name_ja: "大祭", time_prose: "early August", origin: "o", meaning: "m", ritual: "r", prayer: "p", access_type: "public_witness", visitor_notes: "v" },
      { id: 2, shrine_id: 2, name_en: "Lunar Rite", name_ja: "旧暦祭", time_prose: "2nd Sunday of the 6th lunar month", origin: "o2", meaning: "m2", ritual: "r2", prayer: "p2", access_type: "pilgrimage_experience", visitor_notes: "v2" },
    ],
    event_deities: [{ event_id: 1, deity_id: 1, role: "honored" }],
    event_occurrences: [
      { id: 1, event_id: 1, shrine_id: 1, start_date: "2026-07-30", end_date: "2026-08-02" }, // spans Jul–Aug
    ],
    sources: [
      { id: 1, shrine_id: 1, url: "https://example.com/a", title: "A official", source_type: "official", note: null },
    ],
    shrine_search: [
      { shrine_id: 1, slug: "a", name_en: "Shrine A", name_ja: "甲社", city: "Saitama", search_blob: "Shrine A 甲社 Saitama Deity One 神一 Matchmaking Victory Grand Festival 大祭" },
      { shrine_id: 2, slug: "b", name_en: "Shrine B", name_ja: "乙社", city: "Kyoto", search_blob: "Shrine B 乙社 Kyoto Deity Two 神二 Matchmaking Lunar Rite 旧暦祭" },
    ],
  };
}
