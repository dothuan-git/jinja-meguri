import { describe, it, expect } from "vitest";
import { pickHighestRankId, resolveLore } from "@/lib/db/derive";

describe("pickHighestRankId", () => {
  it("returns the rank id with the minimum rank_order", () => {
    const ranks = [
      { id: 10, rank_order: 3 },
      { id: 11, rank_order: 10 },
    ];
    expect(pickHighestRankId(ranks)).toBe(10);
  });
  it("returns null for no ranks", () => {
    expect(pickHighestRankId([])).toBeNull();
  });
});

describe("resolveLore", () => {
  it("prefers regional lore and flags it", () => {
    expect(resolveLore("regional", "canon")).toEqual({ lore: "regional", is_regional: true });
  });
  it("falls back to canonical when regional is null", () => {
    expect(resolveLore(null, "canon")).toEqual({ lore: "canon", is_regional: false });
  });
  it("returns null lore when both are null", () => {
    expect(resolveLore(null, null)).toEqual({ lore: null, is_regional: false });
  });
});
