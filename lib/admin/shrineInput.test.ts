import { describe, it, expect } from "vitest";
import { makeStore } from "@/lib/db/__fixtures__/store";
import { buildEditCatalogs } from "@/lib/admin/shrineInput";

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
});
