import { describe, it, expect } from "vitest";
import { makeStore } from "@/lib/db/__fixtures__/store";
import { buildEditCatalogs, emptyShrineInput } from "@/lib/admin/shrineInput";
import { ShrineInputSchema } from "@/lib/admin/shrineContract";

describe("buildEditCatalogs", () => {
  const catalogs = buildEditCatalogs(makeStore());

  it("orders ranks by rank_order", () => {
    // fixture rank_orders: Ichinomiya=3, Shikinai-sha=5, Sonsha=10
    expect(catalogs.ranks).toEqual(["Ichinomiya", "Shikinai-sha", "Sonsha"]);
  });

  it("lists every prayer category", () => {
    expect(catalogs.prayerCategories.sort()).toEqual(["Matchmaking", "Victory"]);
  });

  it("maps each prefecture to its region name", () => {
    expect(catalogs.prefectures).toEqual([
      { name_en: "Kyoto", region: "Kinki" },
      { name_en: "Saitama", region: "Kanto" },
    ]);
  });

  it("exposes existing deities (name_ja-keyed) with canonical info for the create picker", () => {
    // sorted by name_en: One, Three, Two
    expect(catalogs.deities).toEqual([
      { id: "deity-1", name_en: "Deity One", name_ja: "神一", deity_type: "mythological", titles: ["Lord of the Sun", "Divine Ancestor"], titles_ja: null, canonical_lore: "canon-1", canonical_lore_ja: null, mythic_sphere: null, mythic_sphere_ja: null },
      { id: "deity-3", name_en: "Deity Three", name_ja: "神三", deity_type: "mythological", titles: ["Unenshrined Spirit"], titles_ja: null, canonical_lore: "canon-3", canonical_lore_ja: null, mythic_sphere: null, mythic_sphere_ja: null },
      { id: "deity-2", name_en: "Deity Two", name_ja: "神二", deity_type: "mythological", titles: ["Guardian of the Sea"], titles_ja: null, canonical_lore: "canon-2", canonical_lore_ja: null, mythic_sphere: null, mythic_sphere_ja: null },
    ]);
  });
});

describe("emptyShrineInput", () => {
  it("seeds one primary deity and empty scalars", () => {
    const input = emptyShrineInput();
    expect(input.deities).toHaveLength(1);
    expect(input.deities[0].is_primary).toBe(true);
    expect(input.slug).toBe("");
    expect(input.festivals).toEqual([]);
  });

  it("fails contract validation until required fields are filled (so the bar surfaces errors)", () => {
    expect(ShrineInputSchema.safeParse(emptyShrineInput()).success).toBe(false);
  });
});
