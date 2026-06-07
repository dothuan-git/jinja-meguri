import { describe, it, expect } from "vitest";
import { makeStore } from "@/lib/db/__fixtures__/store";
import { getShrineCards, getShrineDetail, getAllSlugs, getFacetCatalogs } from "@/lib/db/repo";

const store = makeStore();

describe("getShrineCards", () => {
  const cards = getShrineCards(store);
  it("returns one card per shrine", () => expect(cards).toHaveLength(2));
  it("sets primary deity from the is_primary junction row", () => {
    const a = cards.find((c) => c.slug === "a")!;
    expect(a.primary_deity?.name_romaji).toBe("Deity One");
  });
  it("computes highest rank as MIN(rank_order)", () => {
    const a = cards.find((c) => c.slug === "a")!;
    expect(a.highest_rank?.code).toBe("Ichinomiya"); // rank_order 3 beats 10
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
    expect(a.deity_kanji).toContain("神一");
    expect(a.rank_codes.sort()).toEqual(["Ichinomiya", "Sonsha"]);
  });
});

describe("getShrineDetail", () => {
  const a = getShrineDetail(store, "a")!;
  it("orders deities by sort_order and resolves lore via COALESCE", () => {
    expect(a.deities[0].name_romaji).toBe("Deity One");
    expect(a.deities[0].lore).toBe("regional-1");
    expect(a.deities[0].is_regional).toBe(true);
    expect(a.deities[1].lore).toBe("canon-2");
    expect(a.deities[1].is_regional).toBe(false);
  });
  it("flags the highest rank among all ranks", () => {
    const highest = a.ranks.filter((r) => r.is_highest);
    expect(highest).toHaveLength(1);
    expect(highest[0].code).toBe("Ichinomiya");
  });
  it("includes details prose, events, and sources", () => {
    expect(a.details?.history).toBe("hist-a");
    expect(a.events[0].name_en).toBe("Grand Festival");
    expect(a.sources[0].source_type).toBe("official");
  });
  it("returns null for an unknown slug", () => {
    expect(getShrineDetail(store, "nope")).toBeNull();
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
  it("lists distinct deities", () => {
    expect(f.deities.map((d) => d.name_kanji).sort()).toEqual(["神一", "神二"]);
  });
});
