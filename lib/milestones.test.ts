import { describe, it, expect } from "vitest";
import {
  buildMilestoneContext,
  evaluateMilestones,
  getPilgrimRank,
  type MilestoneTotals,
} from "@/lib/milestones";
import type { StampEntry, SavedEntry } from "@/lib/types";

// Minimal StampEntry factory — only the fields the milestone logic reads matter.
function stamp(p: Partial<StampEntry> & { slug: string; stamped_at: string }): StampEntry {
  return {
    slug: p.slug,
    name_en: p.name_en ?? p.slug,
    name_ja: p.name_ja ?? null,
    city: p.city ?? null,
    prefecture: p.prefecture ?? "Tokyo",
    region: p.region ?? "Kanto",
    primary_deity: p.primary_deity ?? null,
    categories: p.categories ?? [],
    highest_rank: p.highest_rank ?? null,
    coordinates: p.coordinates ?? null,
    region_id: p.region_id ?? 1,
    prefecture_id: p.prefecture_id ?? 1,
    rank_codes: p.rank_codes ?? [],
    category_codes: p.category_codes ?? [],
    deity_ja: p.deity_ja ?? [],
    prayer_focus: p.prayer_focus ?? null,
    best_time: p.best_time ?? null,
    primary_deity_titles: p.primary_deity_titles ?? [],
    stamped_at: p.stamped_at,
  };
}

function saved(slug: string, saved_at = "2026-01-01T00:00:00Z"): SavedEntry {
  return { ...stamp({ slug, stamped_at: saved_at }), saved_at } as SavedEntry;
}

const TOTALS: MilestoneTotals = { totalShrines: 20, totalRegions: 3, totalPrefectures: 4 };

function ids(stamped: StampEntry[], savedList: SavedEntry[], totals = TOTALS): Set<string> {
  const ctx = buildMilestoneContext(stamped, savedList, totals);
  return new Set(evaluateMilestones(ctx).filter((m) => m.unlocked).map((m) => m.def.id));
}

describe("buildMilestoneContext", () => {
  it("aggregates collection signals", () => {
    const ctx = buildMilestoneContext(
      [
        stamp({ slug: "a", stamped_at: "2026-01-01T09:00:00Z", prefecture: "Kyoto", region: "Kansai",
          rank_codes: ["Myojin-Taisha"], categories: [{ name_en: "Matchmaking", name_ja: "縁結び", group_label: "Love & Family" }],
          primary_deity: { name_en: "Inari Ōkami", name_ja: "稲荷大神" }, deity_ja: ["稲荷大神"] }),
        stamp({ slug: "b", stamped_at: "2026-01-01T12:00:00Z", prefecture: "Tokyo", region: "Kanto",
          rank_codes: ["Ichinomiya"], primary_deity: { name_en: "Amaterasu", name_ja: "天照大神" } }),
      ],
      [saved("x")],
      TOTALS,
    );
    expect(ctx.stampCount).toBe(2);
    expect(ctx.savedCount).toBe(1);
    expect(ctx.prefectures).toEqual(new Set(["Kyoto", "Tokyo"]));
    expect(ctx.regions).toEqual(new Set(["Kansai", "Kanto"]));
    expect(ctx.ranks).toEqual(new Set(["Myojin-Taisha", "Ichinomiya"]));
    expect(ctx.categoryGroups).toEqual(new Set(["Love & Family"]));
    expect(ctx.distinctDeityCount).toBe(2);
    expect(ctx.maxStampsInOneDay).toBe(2); // both on 2026-01-01
    expect(ctx.distinctMonths).toBe(1);
    expect(ctx.hasNewYearStamp).toBe(true); // Jan 1
  });
});

describe("pilgrim ranks", () => {
  it("resolves the held rank and progress from a goshuin count", () => {
    expect(getPilgrimRank(0).current.title_en).toBe("Novice Pilgrim");
    expect(getPilgrimRank(0).next?.threshold).toBe(1);

    expect(getPilgrimRank(1).current.title_en).toBe("First Steps");
    expect(getPilgrimRank(5).current.title_en).toBe("Sanctuary Explorer");
    expect(getPilgrimRank(10).current.title_en).toBe("Devoted Wanderer");

    // 7 stamps: held rank is Sanctuary Explorer (5), next is Devoted Wanderer (10).
    const mid = getPilgrimRank(7);
    expect(mid.current.title_en).toBe("Sanctuary Explorer");
    expect(mid.next?.title_en).toBe("Devoted Wanderer");
    expect(mid.percent).toBe(70); // 7 / 10 = 70%, matching the "7 / 10 STAMPS" label

    // 1 stamp: First Steps, bar reflects 1 of 5 toward Sanctuary Explorer.
    expect(getPilgrimRank(1).percent).toBe(20);

    // Top rank: no next, pinned at 100%.
    const top = getPilgrimRank(100);
    expect(top.current.title_en).toBe("Hundred Sanctuaries");
    expect(top.next).toBeNull();
    expect(top.percent).toBe(100);
  });
});

describe("geography milestones", () => {
  it("counts distinct prefectures and regions, and 'all' goals use totals", () => {
    const stamps = [
      stamp({ slug: "a", stamped_at: "2026-01-10T10:00:00Z", prefecture: "P1", region: "R1" }),
      stamp({ slug: "b", stamped_at: "2026-02-10T10:00:00Z", prefecture: "P2", region: "R2" }),
      stamp({ slug: "c", stamped_at: "2026-03-10T10:00:00Z", prefecture: "P3", region: "R3" }),
    ];
    const got = ids(stamps, [], { totalShrines: 20, totalRegions: 3, totalPrefectures: 4 });
    expect(got.has("pref_2")).toBe(true);
    expect(got.has("region_3")).toBe(true);
    expect(got.has("all_regions")).toBe(true); // 3 of 3 regions
    expect(got.has("all_prefectures")).toBe(false); // 3 of 4 prefectures
    expect(got.has("multi_month")).toBe(true); // Jan/Feb/Mar
  });
});

describe("rank, deity, and blessing milestones", () => {
  it("matches rank codes including Taisha and exact Ichinomiya", () => {
    const got = ids([stamp({ slug: "a", stamped_at: "2026-06-01T10:00:00Z", rank_codes: ["Kanpei-Taisha"] })], []);
    expect(got.has("taisha")).toBe(true);
    expect(got.has("imperial")).toBe(true); // Kanpei-
    expect(got.has("ichinomiya")).toBe(false);
  });

  it("matches deities by English or kanji", () => {
    const en = ids([stamp({ slug: "a", stamped_at: "2026-06-01T10:00:00Z", primary_deity: { name_en: "Hachiman", name_ja: null } })], []);
    expect(en.has("hachiman")).toBe(true);
    const ja = ids([stamp({ slug: "b", stamped_at: "2026-06-01T10:00:00Z", deity_ja: ["菅原道真"] })], []);
    expect(ja.has("tenjin")).toBe(true);
  });

  it("matches Ōkuninushi by macron'd English name and by kanji", () => {
    const en = ids([stamp({ slug: "a", stamped_at: "2026-06-01T10:00:00Z", primary_deity: { name_en: "Ōkuninushi-no-Ōkami", name_ja: null } })], []);
    expect(en.has("okuninushi")).toBe(true); // diacritic-insensitive
    const ja = ids([stamp({ slug: "b", stamped_at: "2026-06-01T10:00:00Z", deity_ja: ["大国主大神"] })], []);
    expect(ja.has("okuninushi")).toBe(true);
  });

  it("matches other major kami (Konohanasakuya, Ebisu, Tsukuyomi)", () => {
    const konohana = ids([stamp({ slug: "a", stamped_at: "2026-06-01T10:00:00Z", deity_ja: ["木花咲耶姫"] })], []);
    expect(konohana.has("konohana")).toBe(true);
    const ebisu = ids([stamp({ slug: "b", stamped_at: "2026-06-01T10:00:00Z", primary_deity: { name_en: "Ebisu", name_ja: null } })], []);
    expect(ebisu.has("ebisu")).toBe(true);
    const tsukuyomi = ids([stamp({ slug: "c", stamped_at: "2026-06-01T10:00:00Z", deity_ja: ["月読命"] })], []);
    expect(tsukuyomi.has("tsukuyomi")).toBe(true);
  });

  it("matches prayer-focus group labels", () => {
    const got = ids([stamp({ slug: "a", stamped_at: "2026-06-01T10:00:00Z",
      categories: [{ name_en: "Academic Success", name_ja: "学業成就", group_label: "Scholarship" }] })], []);
    expect(got.has("study")).toBe(true);
  });
});

describe("behavioral milestones", () => {
  it("same-day, wishlist, and coverage", () => {
    const sameDay = Array.from({ length: 3 }, (_, i) =>
      stamp({ slug: `d${i}`, stamped_at: "2026-05-05T08:00:00Z" }));
    expect(ids(sameDay, []).has("same_day_3")).toBe(true);

    const wishlist = Array.from({ length: 10 }, (_, i) => saved(`w${i}`));
    expect(ids([], wishlist).has("wishlist_10")).toBe(true);

    // 5 of 20 shrines = 25% coverage
    const five = Array.from({ length: 5 }, (_, i) => stamp({ slug: `c${i}`, stamped_at: "2026-06-01T10:00:00Z" }));
    expect(ids(five, []).has("coverage_25")).toBe(true);
  });
});

describe("hard / high-tier milestones", () => {
  const manyPref = (n: number) =>
    Array.from({ length: n }, (_, i) =>
      stamp({ slug: `p${i}`, stamped_at: "2026-06-01T10:00:00Z", prefecture: `P${i}`, region: `R${i % 8}` }));

  it("prefecture ladder unlocks 10/20/30 and 'all' uses the full catalog total", () => {
    const totals = { totalShrines: 100, totalRegions: 8, totalPrefectures: 47 };
    const at25 = ids(manyPref(25), [], totals);
    expect(at25.has("pref_10")).toBe(true);
    expect(at25.has("pref_20")).toBe(true);
    expect(at25.has("pref_30")).toBe(false);
    expect(at25.has("all_prefectures")).toBe(false);

    const at47 = ids(manyPref(47), [], totals);
    expect(at47.has("pref_30")).toBe(true);
    expect(at47.has("all_prefectures")).toBe(true); // 47 of 47
  });

  it("coverage_50/100, rank_variety, deity_variety_10, year_round", () => {
    // 100 stamps across all 12 months, 5 ranks, 10 deities, at 100% coverage.
    const stamps = Array.from({ length: 100 }, (_, i) =>
      stamp({
        slug: `x${i}`,
        // Vary both month (all 12) and day so visits are spread across distinct days.
        stamped_at: `2026-${String((i % 12) + 1).padStart(2, "0")}-${String((i % 28) + 1).padStart(2, "0")}T10:00:00Z`,
        rank_codes: [`Rank${i % 5}`],
        primary_deity: { name_en: `Deity ${i % 10}`, name_ja: null },
      }));
    const got = ids(stamps, [], { totalShrines: 100, totalRegions: 8, totalPrefectures: 47 });
    expect(got.has("coverage_50")).toBe(true);
    expect(got.has("coverage_100")).toBe(true);
    expect(got.has("rank_variety")).toBe(true); // 5 distinct ranks
    expect(got.has("deity_variety_10")).toBe(true); // 10 distinct deities
    expect(got.has("year_round")).toBe(true); // all 12 months
    expect(got.has("same_day_5")).toBe(false); // spread across days
  });
});

describe("empty collection", () => {
  it("unlocks nothing", () => {
    expect(ids([], []).size).toBe(0);
  });
});

describe("milestone progress", () => {
  const ev = (stamped: StampEntry[], savedList: SavedEntry[], totals = TOTALS) =>
    evaluateMilestones(buildMilestoneContext(stamped, savedList, totals));
  const find = (m: ReturnType<typeof ev>, id: string) => m.find((x) => x.def.id === id)!;

  it("reports partial progress for count-style milestones", () => {
    const three = Array.from({ length: 3 }, (_, i) =>
      stamp({ slug: `s${i}`, stamped_at: "2026-06-01T10:00:00Z", prefecture: `P${i}` }));
    const m = find(ev(three, []), "pref_5");
    expect(m.unlocked).toBe(false);
    expect(m.current).toBe(3);
    expect(m.target).toBe(5);
    expect(m.percent).toBe(60);
  });

  it("caps current at target and forces 100% once unlocked", () => {
    const ten = Array.from({ length: 10 }, (_, i) =>
      stamp({ slug: `s${i}`, stamped_at: "2026-06-01T10:00:00Z", prefecture: `P${i}` }));
    const m = find(ev(ten, []), "pref_5");
    expect(m.unlocked).toBe(true);
    expect(m.current).toBe(5); // capped from 10
    expect(m.percent).toBe(100);
  });

  it("treats boolean-style milestones as 0% / 100% with target 1", () => {
    const locked = find(ev([], []), "amaterasu");
    expect(locked).toMatchObject({ unlocked: false, current: 0, target: 1, percent: 0 });
    const unlocked = find(
      ev([stamp({ slug: "a", stamped_at: "2026-06-01T10:00:00Z", primary_deity: { name_en: "Amaterasu", name_ja: "天照大神" } })], []),
      "amaterasu",
    );
    expect(unlocked).toMatchObject({ unlocked: true, current: 1, target: 1, percent: 100 });
  });
});
