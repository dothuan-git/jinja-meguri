import { describe, it, expect } from "vitest";
import { pickHighestRankId } from "@/lib/db/derive";

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
