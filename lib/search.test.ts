import { describe, it, expect } from "vitest";
import { toSearchDocs, makeSearcher } from "@/lib/search";
import { makeStore } from "@/lib/db/__fixtures__/store";

const docs = toSearchDocs(makeStore());
const search = makeSearcher(docs);

describe("search", () => {
  it("ranks an exact English shrine name first", () => {
    const results = search("Shrine A");
    expect(results[0].slug).toBe("a");
  });
  it("matches Japanese (kanji) terms", () => {
    const results = search("甲社");
    expect(results.map((r) => r.slug)).toContain("a");
  });
  it("matches a deity name across shrines", () => {
    const results = search("Deity Two");
    expect(results.map((r) => r.slug)).toEqual(expect.arrayContaining(["a", "b"]));
  });
  it("tolerates a typo", () => {
    const results = search("Shirne A"); // transposed
    expect(results.map((r) => r.slug)).toContain("a");
  });
  it("returns [] for empty query", () => {
    expect(search("   ")).toEqual([]);
  });
});
