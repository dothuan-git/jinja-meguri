import { describe, it, expect } from "vitest";
import type { ShrineCard } from "@/lib/types";
import {
  readShrineFilters,
  matchesShrineFilters,
  hasActiveShrineFilters,
  type ShrineFilters,
} from "@/lib/shrineFilters";

const card: ShrineCard = {
  slug: "yasaka",
  name_en: "Yasaka Shrine",
  name_ja: "八坂神社",
  name_hiragana: null,
  city: "Kyoto",
  prefecture: { name_en: "Kyoto Prefecture", name_ja: null },
  region: { name_en: "Kansai", name_ja: null },
  primary_deity: { name_en: "Susanoo", name_ja: "素戔嗚尊", name_hiragana: null },
  categories: [],
  ranks: [],
  highest_rank: null,
  coordinates: { lat: 35.0036, lng: 135.7785 },
  region_id: 1,
  prefecture_id: 1,
  rank_codes: ["Kanpei-taisha"],
  category_codes: ["Protection"],
  deity_ja: ["素戔嗚尊"],
  festival_months: [7], // Gion Matsuri — July
  festivals_brief: [{ name_en: "Gion Matsuri", name_ja: "祇園祭", name_hiragana: null, when: "Jul" }],
  prayer_focus: null,
  best_time: null,
  primary_deity_titles: [],
};

const none: ShrineFilters = {
  searchQuery: "",
  prayerFocus: [],
  ranks: [],
  region: [],
  prefecture: [],
  deity: [],
  festivalMonths: null,
};

describe("readShrineFilters", () => {
  it("reads all facets from URL params", () => {
    const params = new URLSearchParams("q=fox&cat=Protection&cat=Luck&rank=Sonsha&region=Kansai&pref=Kyoto&deity=Inari&fmFrom=3&fmTo=5");
    expect(readShrineFilters(params)).toEqual({
      searchQuery: "fox",
      prayerFocus: ["Protection", "Luck"],
      ranks: ["Sonsha"],
      region: ["Kansai"],
      prefecture: ["Kyoto"],
      deity: ["Inari"],
      festivalMonths: { from: 3, to: 5 },
    });
  });

  it("ignores an incomplete or out-of-range festival month range", () => {
    expect(readShrineFilters(new URLSearchParams("fmFrom=3")).festivalMonths).toBeNull();
    expect(readShrineFilters(new URLSearchParams("fmFrom=0&fmTo=5")).festivalMonths).toBeNull();
    expect(readShrineFilters(new URLSearchParams("fmFrom=3&fmTo=13")).festivalMonths).toBeNull();
  });

  it("defaults to empty filters", () => {
    expect(readShrineFilters(new URLSearchParams())).toEqual(none);
  });
});

describe("matchesShrineFilters", () => {
  it("passes with no active filters", () => {
    expect(matchesShrineFilters(card, none)).toBe(true);
  });

  it("matches search across name, kanji, location, deity and rank", () => {
    expect(matchesShrineFilters(card, { ...none, searchQuery: "yasaka" })).toBe(true);
    expect(matchesShrineFilters(card, { ...none, searchQuery: "八坂" })).toBe(true);
    expect(matchesShrineFilters(card, { ...none, searchQuery: "kyoto" })).toBe(true);
    expect(matchesShrineFilters(card, { ...none, searchQuery: "susanoo" })).toBe(true);
    expect(matchesShrineFilters(card, { ...none, searchQuery: "素戔嗚" })).toBe(true);
    expect(matchesShrineFilters(card, { ...none, searchQuery: "kanpei" })).toBe(true);
    expect(matchesShrineFilters(card, { ...none, searchQuery: "izumo" })).toBe(false);
  });

  it("filters by category, rank, region, prefecture and primary deity", () => {
    expect(matchesShrineFilters(card, { ...none, prayerFocus: ["Protection"] })).toBe(true);
    expect(matchesShrineFilters(card, { ...none, prayerFocus: ["Luck"] })).toBe(false);
    expect(matchesShrineFilters(card, { ...none, ranks: ["Kanpei-taisha"] })).toBe(true);
    expect(matchesShrineFilters(card, { ...none, ranks: ["Sonsha"] })).toBe(false);
    expect(matchesShrineFilters(card, { ...none, region: ["Kansai"] })).toBe(true);
    expect(matchesShrineFilters(card, { ...none, region: ["Kanto"] })).toBe(false);
    expect(matchesShrineFilters(card, { ...none, prefecture: ["Kyoto Prefecture"] })).toBe(true);
    expect(matchesShrineFilters(card, { ...none, prefecture: ["Nara"] })).toBe(false);
    expect(matchesShrineFilters(card, { ...none, deity: ["Susanoo"] })).toBe(true);
    expect(matchesShrineFilters(card, { ...none, deity: ["Amaterasu"] })).toBe(false);
  });

  it("requires a primary deity for deity filters", () => {
    expect(matchesShrineFilters({ ...card, primary_deity: null }, { ...none, deity: ["Susanoo"] })).toBe(false);
  });

  it("filters by festival month range, including year-wrapping ranges", () => {
    expect(matchesShrineFilters(card, { ...none, festivalMonths: { from: 6, to: 8 } })).toBe(true);
    expect(matchesShrineFilters(card, { ...none, festivalMonths: { from: 1, to: 3 } })).toBe(false);
    // Winter range wraps the year end (Dec–Feb); July shrine is excluded.
    expect(matchesShrineFilters(card, { ...none, festivalMonths: { from: 12, to: 2 } })).toBe(false);
    // A shrine whose festival is in January matches the wrapping winter range.
    const jan = { ...card, festival_months: [1] };
    expect(matchesShrineFilters(jan, { ...none, festivalMonths: { from: 12, to: 2 } })).toBe(true);
    // A shrine with no dated festivals never matches an active season filter.
    const undated = { ...card, festival_months: [] };
    expect(matchesShrineFilters(undated, { ...none, festivalMonths: { from: 1, to: 12 } })).toBe(false);
  });
});

describe("hasActiveShrineFilters", () => {
  it("detects empty vs active filters", () => {
    expect(hasActiveShrineFilters(none)).toBe(false);
    expect(hasActiveShrineFilters({ ...none, searchQuery: "x" })).toBe(true);
    expect(hasActiveShrineFilters({ ...none, region: ["Kansai"] })).toBe(true);
    expect(hasActiveShrineFilters({ ...none, festivalMonths: { from: 3, to: 5 } })).toBe(true);
  });
});
