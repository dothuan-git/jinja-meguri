// Live key-completeness check for the shrine JSON import form.
// The research prompt mandates a fully-keyed JSON (every field present, empties
// as null/[]). This verifies a pasted object actually carries every expected key
// at each object level, and reports any that are missing — independent of Zod
// validation (which ignores absent optional keys).

export const EXPECTED_KEYS = {
  shrine: [
    "slug", "name_en", "name_ja", "region", "prefecture", "city", "address",
    "coordinates", "image_urls", "details", "ranks",
    "prayer_categories", "deities", "festivals", "sources",
  ],
  details: ["history", "description", "prayer_focus", "best_time"],
  deity: ["name_ja", "is_primary", "sort_order", "regional_lore", "canonical"],
  // Shrine-embedded canonical block: no canonical_lore. The deity is created first
  // (with its lore) via the standalone deity importer, then reused when the shrine
  // is added, so the shrine JSON never re-supplies the canonical narrative.
  canonical: ["name_en", "name_ja", "deity_type", "titles"],
  // Standalone canonical-deity import (admin/deities/new) — carries the lore.
  deityStandalone: ["name_en", "name_ja", "deity_type", "titles", "canonical_lore"],
  festival: [
    "name_en", "name_ja", "time_prose", "origin",
    "meaning", "ritual", "prayer", "festival_type", "visitor_notes", "occurrences",
  ],
  occurrence: ["year", "start_date", "end_date", "notes"],
  source: ["url", "title"],
} as const;

export interface CompletenessGroup {
  /** Human label, e.g. "top-level", "deities[0]", "festivals[1].occurrences[0]" */
  label: string;
  expected: number;
  present: number;
  missing: string[];
}

export interface CompletenessReport {
  groups: CompletenessGroup[];
  totalExpected: number;
  totalPresent: number;
  totalMissing: number;
  complete: boolean;
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function check(
  obj: Record<string, unknown>,
  keys: readonly string[],
  label: string,
): CompletenessGroup {
  const missing = keys.filter((k) => !(k in obj));
  return { label, expected: keys.length, present: keys.length - missing.length, missing };
}

// Standalone canonical-deity import (admin/deities/new) — a single object,
// not nested inside a shrine.
export function checkDeityCompleteness(data: unknown): CompletenessReport {
  if (!isObject(data)) {
    return { groups: [], totalExpected: 0, totalPresent: 0, totalMissing: 0, complete: false };
  }
  const groups = [check(data, EXPECTED_KEYS.deityStandalone, "deity")];
  const totalExpected = groups.reduce((n, g) => n + g.expected, 0);
  const totalPresent = groups.reduce((n, g) => n + g.present, 0);
  const totalMissing = totalExpected - totalPresent;
  return { groups, totalExpected, totalPresent, totalMissing, complete: totalMissing === 0 };
}

export function checkCompleteness(data: unknown): CompletenessReport {
  const groups: CompletenessGroup[] = [];

  if (!isObject(data)) {
    return { groups: [], totalExpected: 0, totalPresent: 0, totalMissing: 0, complete: false };
  }

  groups.push(check(data, EXPECTED_KEYS.shrine, "top-level"));

  if (isObject(data.details)) {
    groups.push(check(data.details, EXPECTED_KEYS.details, "details"));
  }

  if (Array.isArray(data.deities)) {
    data.deities.forEach((d, i) => {
      if (!isObject(d)) return;
      groups.push(check(d, EXPECTED_KEYS.deity, `deities[${i}]`));
      if (isObject(d.canonical)) {
        groups.push(check(d.canonical, EXPECTED_KEYS.canonical, `deities[${i}].canonical`));
      }
    });
  }

  if (Array.isArray(data.festivals)) {
    data.festivals.forEach((f, i) => {
      if (!isObject(f)) return;
      groups.push(check(f, EXPECTED_KEYS.festival, `festivals[${i}]`));
      if (Array.isArray(f.occurrences)) {
        f.occurrences.forEach((o, j) => {
          if (!isObject(o)) return;
          groups.push(check(o, EXPECTED_KEYS.occurrence, `festivals[${i}].occurrences[${j}]`));
        });
      }
    });
  }

  if (Array.isArray(data.sources)) {
    data.sources.forEach((s, i) => {
      if (!isObject(s)) return;
      groups.push(check(s, EXPECTED_KEYS.source, `sources[${i}]`));
    });
  }

  const totalExpected = groups.reduce((n, g) => n + g.expected, 0);
  const totalPresent = groups.reduce((n, g) => n + g.present, 0);
  const totalMissing = totalExpected - totalPresent;

  return { groups, totalExpected, totalPresent, totalMissing, complete: totalMissing === 0 };
}
