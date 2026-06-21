import { describe, it, expect } from "vitest";
import { makeStore } from "@/lib/db/__fixtures__/store";
import { getMarkState, getUserCollections, savedSlugs, stampedSlugs } from "@/lib/db/userRepo";
import type { UserMark } from "@/lib/types";

const store = makeStore(); // shrines "a" and "b"

const marks: UserMark[] = [
  { slug: "a", saved_at: "2026-01-02T10:00:00Z", stamped_at: "2026-02-01T10:00:00Z" },
  { slug: "b", saved_at: null, stamped_at: "2026-03-01T10:00:00Z" },
];

describe("getMarkState", () => {
  it("reflects both columns for a known slug", () => {
    expect(getMarkState(marks, "a")).toEqual({ saved: true, stamped: true });
    expect(getMarkState(marks, "b")).toEqual({ saved: false, stamped: true });
  });
  it("defaults to false for an unmarked slug", () => {
    expect(getMarkState(marks, "nope")).toEqual({ saved: false, stamped: false });
  });
});

describe("savedSlugs / stampedSlugs", () => {
  it("filters by the relevant timestamp column", () => {
    expect(savedSlugs(marks)).toEqual(["a"]);
    expect(stampedSlugs(marks).sort()).toEqual(["a", "b"]);
  });
});

describe("getUserCollections", () => {
  const { stamped, saved } = getUserCollections(store, marks);

  it("joins marks to shrine cards", () => {
    expect(saved.map((c) => c.slug)).toEqual(["a"]);
    expect(saved[0].name_en).toBeTruthy();
    expect(saved[0].saved_at).toBe("2026-01-02T10:00:00Z");
  });
  it("sorts stamped newest first and carries the stamp date", () => {
    expect(stamped.map((c) => c.slug)).toEqual(["b", "a"]); // 2026-03 before 2026-02
    expect(stamped[0].stamped_at).toBe("2026-03-01T10:00:00Z");
  });
  it("drops marks whose shrine is absent from the store", () => {
    const orphan: UserMark[] = [{ slug: "ghost", saved_at: "2026-01-01T00:00:00Z", stamped_at: null }];
    expect(getUserCollections(store, orphan).saved).toHaveLength(0);
  });
});
