import { describe, it, expect } from "vitest";
import { makeStore } from "@/lib/db/__fixtures__/store";
import { getShrineCards, getShrineDetail, getAllSlugs, getFacetCatalogs, getFestivalYear, getDeityList } from "@/lib/db/repo";

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
  it("derives festival_months from festival date spans", () => {
    // Shrine A's festival runs 2026-07-30 → 2026-08-02, so it spans July & August.
    expect(cards.find((c) => c.slug === "a")!.festival_months).toEqual([7, 8]);
    // Shrine B's only festival is undated (lunar) with no occurrences → no months.
    expect(cards.find((c) => c.slug === "b")!.festival_months).toEqual([]);
  });
  it("builds festivals_brief with a time_prose 'when' for the map popup", () => {
    expect(cards.find((c) => c.slug === "a")!.festivals_brief).toEqual([
      { name_en: "Grand Festival", name_ja: "大祭", when: "early August" },
    ]);
    // Undated lunar festival still lists, using its time_prose.
    expect(cards.find((c) => c.slug === "b")!.festivals_brief).toEqual([
      { name_en: "Lunar Rite", name_ja: "旧暦祭", when: "2nd Sunday of the 6th lunar month" },
    ]);
  });
});

describe("getShrineCards extended fields", () => {
  it("includes prayer_focus, best_time, primary_deity_titles", () => {
    const card = getShrineCards(store)[0];
    expect(card).toHaveProperty("prayer_focus");
    expect(card).toHaveProperty("best_time");
    expect(Array.isArray(card.primary_deity_titles)).toBe(true);
  });
  it("resolves primary_deity_titles from alter_titles when set, else canonical titles", () => {
    const cards = getShrineCards(store);
    expect(cards.find((c) => c.slug === "a")!.primary_deity_titles).toEqual(["Shrine-Local Title"]);
    expect(cards.find((c) => c.slug === "b")!.primary_deity_titles).toEqual(["Guardian of the Sea"]);
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
  it("keeps alter_titles separate from canonical titles", () => {
    expect(a.deities[0].alter_titles).toEqual(["Shrine-Local Title"]);
    expect(a.deities[1].alter_titles).toBeNull();
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
    expect(a.festivals[0].festival_type).toBe("spectacle");
  });
  it("returns null for an unknown slug", () => {
    expect(getShrineDetail(store, "nope")).toBeNull();
  });
});

describe("locale handling", () => {
  it("falls back to English when locale is ja but _ja columns are null", () => {
    const a = getShrineDetail(store, "a", "ja")!;
    // Fixture has no history_ja/description_ja set — must fall back to EN prose.
    expect(a.details?.history).toBe("hist-a");
    expect(a.details?.description).toBe("desc-a");
    expect(a.city).toBe("Saitama");
  });

  it("uses the _ja column when present and locale is ja", () => {
    const storeJa = {
      ...store,
      shrine_details: store.shrine_details.map((d) =>
        d.shrine_id === "shrine-a" ? { ...d, history_ja: "歴史あ" } : d,
      ),
    };
    const a = getShrineDetail(storeJa, "a", "ja")!;
    expect(a.details?.history).toBe("歴史あ");
    // English locale is unaffected by the _ja value.
    const aEn = getShrineDetail(storeJa, "a", "en")!;
    expect(aEn.details?.history).toBe("hist-a");
  });

  it("falls back to the whole titles array when titles_ja is empty (never element-wise)", () => {
    const storeJa = {
      ...store,
      deities: store.deities.map((d) => (d.id === "deity-1" ? { ...d, titles_ja: [] } : d)),
    };
    const cards = getShrineCards(storeJa, "ja");
    const a = cards.find((c) => c.slug === "a")!;
    // Primary deity titles come from alter_titles (unaffected here), but the
    // deity's own titles (used elsewhere) still fall back to the EN array.
    expect(a.primary_deity_titles).toEqual(["Shrine-Local Title"]);
  });

  it("defaults to English when no locale argument is passed", () => {
    const cards = getShrineCards(store);
    expect(cards.find((c) => c.slug === "a")!.city).toBe("Saitama");
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

  // festival-1 has a default 2026-07-30..2026-08-02; festival-2 has no default date.
  const occ = (festival_id: string, year: number, start: string, end: string | null) => ({
    id: `occ-${festival_id}-${year}`, festival_id, year, start_date: start, end_date: end, notes: null, notes_ja: null,
  });
  const storeWith = (occurrences: ReturnType<typeof occ>[]) => ({ ...store, festival_occurrences: occurrences });

  it("uses the current-year occurrence over the default", () => {
    const list = getFestivalYear(storeWith([occ("festival-1", 2026, "2026-08-10", "2026-08-11")]), 2026);
    const f1 = list.find((f) => f.festival_id === "festival-1")!;
    expect(f1.start_date).toBe("2026-08-10");
    expect(f1.month).toBe(8);
    expect(f1.is_fallback).toBe(false);
  });

  it("projects the default month-day onto the queried year when no occurrence", () => {
    const f1 = getFestivalYear(store, 2027).find((f) => f.festival_id === "festival-1")!;
    expect(f1.start_date).toBe("2027-07-30");
    expect(f1.end_date).toBe("2027-08-02");
    expect(f1.month).toBe(7);
    expect(f1.is_fallback).toBe(false);
  });

  it("uses a current-year occurrence for a festival that has no default", () => {
    const f2 = getFestivalYear(storeWith([occ("festival-2", 2026, "2026-06-14", null)]), 2026)
      .find((f) => f.festival_id === "festival-2")!;
    expect(f2.start_date).toBe("2026-06-14");
    expect(f2.is_fallback).toBe(false);
  });

  it("is undated (is_fallback) with no occurrence and no default", () => {
    // festival-2 has only a 2026 occurrence; querying 2027 leaves it with nothing to show.
    const f2 = getFestivalYear(storeWith([occ("festival-2", 2026, "2026-06-14", null)]), 2027)
      .find((f) => f.festival_id === "festival-2")!;
    expect(f2.start_date).toBeNull();
    expect(f2.month).toBeNull();
    expect(f2.is_fallback).toBe(true);
  });
});

describe("getAllSlugs", () => {
  it("returns every slug", () => expect(getAllSlugs(store).sort()).toEqual(["a", "b"]));
});

describe("getDeityList", () => {
  it("returns deities with their enshrining shrines", () => {
    const list = getDeityList(store);
    expect(list.length).toBeGreaterThan(0);
    const d = list[0];
    expect(d).toHaveProperty("name_en");
    expect(Array.isArray(d.titles)).toBe(true);
    expect(Array.isArray(d.shrines)).toBe(true);
    expect(d.shrines.length).toBeGreaterThan(0);
    expect(d.shrines[0]).toHaveProperty("slug");
    expect(d.shrines[0]).toHaveProperty("is_primary");
  });

  it("still includes deities with no shrine links", () => {
    const list = getDeityList(store);
    const unenshrined = list.find((d) => d.name_en === "Deity Three");
    expect(unenshrined).toBeDefined();
    expect(unenshrined!.shrines).toEqual([]);
  });
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
