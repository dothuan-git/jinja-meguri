import { describe, it, expect } from "vitest";
import { toSearchDocs, makeSearcher, fold } from "@/lib/search";
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
  it("matches a macron'd field from an ASCII query (Kyōto ⟵ 'Kyoto')", () => {
    const results = search("Kyoto");
    expect(results.map((r) => r.slug)).toContain("b");
  });
  it("matches an ASCII field from a macron'd query ('Shrīne' ⟶ Shrine)", () => {
    const results = search("Shrīne A");
    expect(results[0].slug).toBe("a");
  });
});

describe("fold", () => {
  it("strips macrons and lowercases", () => {
    expect(fold("Inari Ōkami")).toBe("inari okami");
    expect(fold("Amaterasu Ōmikami")).toBe("amaterasu omikami");
  });
  it("leaves kanji untouched", () => {
    expect(fold("稲荷大神")).toBe("稲荷大神");
  });
});
