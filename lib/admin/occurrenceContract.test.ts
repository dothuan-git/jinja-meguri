import { describe, it, expect } from "vitest";
import { OccurrenceImportSchema } from "@/lib/admin/occurrenceContract";

const target = (over: Record<string, unknown> = {}) => ({
  shrine_slug: "fushimi-inari-taisha",
  festival_name_en: "Hatsuuma Taisai",
  occurrences: [{ year: 2026, start_date: "2026-02-08", end_date: null, notes: null }],
  ...over,
});

describe("OccurrenceImportSchema", () => {
  it("accepts a single target object", () => {
    expect(OccurrenceImportSchema.safeParse(target()).success).toBe(true);
  });

  it("accepts an array of targets", () => {
    expect(OccurrenceImportSchema.safeParse([target(), target({ festival_name_en: "Motomiya Sai" })]).success).toBe(true);
  });

  it("rejects a bad date format", () => {
    const bad = target({ occurrences: [{ year: 2026, start_date: "Feb 8 2026" }] });
    expect(OccurrenceImportSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects an empty occurrences array", () => {
    expect(OccurrenceImportSchema.safeParse(target({ occurrences: [] })).success).toBe(false);
  });

  it("rejects a missing festival_name_en", () => {
    const { festival_name_en, ...rest } = target();
    void festival_name_en;
    expect(OccurrenceImportSchema.safeParse(rest).success).toBe(false);
  });
});
