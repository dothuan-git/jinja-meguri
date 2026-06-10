import { describe, it, expect } from "vitest";
import { makeStore } from "@/lib/db/__fixtures__/store";
import { entriesForMonth, monthRange } from "@/lib/calendar";

const store = makeStore();

describe("monthRange", () => {
  it("returns first and last day of a month (ISO)", () => {
    expect(monthRange(2026, 7)).toEqual({ start: "2026-07-01", end: "2026-07-31" });
    expect(monthRange(2026, 2)).toEqual({ start: "2026-02-01", end: "2026-02-28" });
  });
});

describe("entriesForMonth", () => {
  it("includes a multi-day festival in EVERY month its date range overlaps", () => {
    // festival 1 spans 2026-07-30 .. 2026-08-02
    const jul = entriesForMonth(store, 2026, 7).filter((e) => !e.is_fallback);
    const aug = entriesForMonth(store, 2026, 8).filter((e) => !e.is_fallback);
    expect(jul.some((e) => e.festival_id === "festival-1")).toBe(true);
    expect(aug.some((e) => e.festival_id === "festival-1")).toBe(true);
  });
  it("returns undated festivals as fallbacks with null dates", () => {
    const entries = entriesForMonth(store, 2026, 6);
    const fallback = entries.find((e) => e.festival_id === "festival-2");
    expect(fallback?.is_fallback).toBe(true);
    expect(fallback?.start_date).toBeNull();
    expect(fallback?.time_prose).toContain("lunar");
  });
  it("does not duplicate a fallback festival within a single month query", () => {
    const entries = entriesForMonth(store, 2026, 6).filter((e) => e.festival_id === "festival-2");
    expect(entries).toHaveLength(1);
  });
  it("attaches region and category codes for filtering", () => {
    const jul = entriesForMonth(store, 2026, 7).find((e) => e.festival_id === "festival-1")!;
    expect(jul.region).toBe("Kanto");
    expect(jul.category_codes).toContain("Matchmaking");
  });
});
