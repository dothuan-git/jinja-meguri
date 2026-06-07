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
  it("includes a multi-day occurrence in EVERY month it overlaps", () => {
    // occurrence spans 2026-07-30 .. 2026-08-02
    const jul = entriesForMonth(store, 2026, 7).filter((e) => !e.is_fallback);
    const aug = entriesForMonth(store, 2026, 8).filter((e) => !e.is_fallback);
    expect(jul.some((e) => e.event_id === 1)).toBe(true);
    expect(aug.some((e) => e.event_id === 1)).toBe(true);
  });
  it("falls back to time_prose for an event with no occurrences in the chosen year", () => {
    const entries = entriesForMonth(store, 2026, 6);
    const fallback = entries.find((e) => e.event_id === 2);
    expect(fallback?.is_fallback).toBe(true);
    expect(fallback?.start_date).toBeNull();
    expect(fallback?.time_prose).toContain("lunar");
  });
  it("does not duplicate a fallback event into months that already showed it", () => {
    const entries = entriesForMonth(store, 2026, 6).filter((e) => e.event_id === 2);
    expect(entries).toHaveLength(1);
  });
  it("attaches region and category codes for filtering", () => {
    const jul = entriesForMonth(store, 2026, 7).find((e) => e.event_id === 1)!;
    expect(jul.region).toBe("Kanto");
    expect(jul.category_codes).toContain("Matchmaking");
  });
});
