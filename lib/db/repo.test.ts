import { describe, it, expect } from "vitest";
import { makeStore } from "@/lib/db/__fixtures__/store";
import { getShrineCards, getShrineDetail, getAllSlugs, getFacetCatalogs, getFestivalYear } from "@/lib/db/repo";

const store = makeStore();

describe("getShrineCards", () => {
  const cards = getShrineCards(store);
  it("returns one card per shrine", () => expect(cards).toHaveLength(2));
  it("sets primary deity from the is_primary junction row", () => {
    const a = cards.find((c) => c.slug === "a")!;
    expect(a.primary_deity?.name_en).toBe("Deity One");
  });
  it("computes highest rank as MIN(rank_order)", () => {
    const a = cards.find((c) => c.slug === "a")!;
    expect(a.highest_rank?.name_en).toBe("Ichinomiya"); // rank_order 3 beats 10
    expect(a.highest_rank?.is_highest).toBe(true);
  });
  it("resolves region and prefecture names", () => {
    const a = cards.find((c) => c.slug === "a")!;
    expect(a.region).toBe("Kanto");
    expect(a.prefecture).toBe("Saitama");
  });
  it("carries facet membership for client filtering", () => {
    const a = cards.find((c) => c.slug === "a")!;
    expect(a.category_codes.sort()).toEqual(["Matchmaking", "Victory"]);
    expect(a.deity_ja).toContain("神一");
    expect(a.rank_codes.sort()).toEqual(["Ichinomiya", "Sonsha"]);
  });
});

describe("getShrineCards extended fields", () => {
  it("includes prayer_focus, best_time, primary_deity_titles, image_url", () => {
    const card = getShrineCards(store)[0];
    expect(card).toHaveProperty("prayer_focus");
    expect(card).toHaveProperty("best_time");
    expect(Array.isArray(card.primary_deity_titles)).toBe(true);
    expect(card).toHaveProperty("image_url");
  });
});

describe("getShrineDetail", () => {
  const a = getShrineDetail(store, "a")!;
  it("orders deities by sort_order and exposes both lore fields separately", () => {
    expect(a.deities[0].name_en).toBe("Deity One");
    expect(a.deities[0].regional_lore).toBe("regional-1");
    expect(a.deities[0].canonical_lore).toBe("canon-1");
    expect(a.deities[1].regional_lore).toBeNull();
    expect(a.deities[1].canonical_lore).toBe("canon-2");
  });
  it("exposes deity titles as an array", () => {
    expect(a.deities[0].titles).toEqual(["Lord of the Sun", "Divine Ancestor"]);
  });
  it("flags the highest rank among all ranks", () => {
    const highest = a.ranks.filter((r) => r.is_highest);
    expect(highest).toHaveLength(1);
    expect(highest[0].name_en).toBe("Ichinomiya");
  });
  it("includes details prose, festivals, and sources", () => {
    expect(a.details?.history).toBe("hist-a");
    expect(a.details?.description).toBe("desc-a");
    expect(a.festivals[0].name_en).toBe("Grand Festival");
    expect(a.sources[0].title).toBe("A official");
  });
  it("includes festival dates and type", () => {
    expect(a.festivals[0].start_date).toBe("2026-07-30");
    expect(a.festivals[0].end_date).toBe("2026-08-02");
    expect(a.festivals[0].festival_type).toBe("public_witness");
  });
  it("returns null for an unknown slug", () => {
    expect(getShrineDetail(store, "nope")).toBeNull();
  });
});

describe("getFestivalYear", () => {
  it("returns festivals with prose and a resolved month", () => {
    const list = getFestivalYear(store, 2026);
    expect(Array.isArray(list)).toBe(true);
    const f = list[0];
    expect(f).toHaveProperty("festival_name_en");
    expect(f).toHaveProperty("meaning");
    expect(f).toHaveProperty("shrine_slug");
    expect(f).toHaveProperty("festival_type");
    // month is null (fallback) or 1..12
    expect(f.month === null || (f.month! >= 1 && f.month! <= 12)).toBe(true);
  });
});

describe("getAllSlugs", () => {
  it("returns every slug", () => expect(getAllSlugs(store).sort()).toEqual(["a", "b"]));
});

describe("getFacetCatalogs", () => {
  const f = getFacetCatalogs(store);
  it("groups prayer categories by group_label", () => {
    const labels = f.categoryGroups.map((g) => g.group_label).sort();
    expect(labels).toEqual(["Fortune & Success", "Love & Family"]);
  });
  it("maps prefectures by region id", () => {
    expect(f.prefecturesByRegion[1].map((p) => p.name_en)).toEqual(["Saitama"]);
  });
  it("lists distinct deities by japanese name", () => {
    expect(f.deities.map((d) => d.name_ja).sort()).toEqual(["神一", "神二"]);
  });
});
