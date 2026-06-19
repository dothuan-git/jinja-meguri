import { z } from "zod";
import { OccurrenceSchema } from "@/lib/admin/shrineContract";

// Bulk festival-occurrence import. Each target identifies a festival by its host shrine slug +
// English name (the festivals table is UNIQUE on (shrine_id, name_en), so this resolves to one row),
// then carries the per-year dates to upsert.
export const OccurrenceImportTargetSchema = z.object({
  shrine_slug: z.string().min(1).regex(/^[a-z0-9-]+$/, "slug must be lowercase letters, digits, or hyphens"),
  festival_name_en: z.string().min(1),
  occurrences: z.array(OccurrenceSchema).min(1, "At least one occurrence is required"),
});

// Accept a single target or an array of them; the action normalizes to an array.
export const OccurrenceImportSchema = z.union([
  OccurrenceImportTargetSchema,
  z.array(OccurrenceImportTargetSchema).min(1, "At least one target is required"),
]);

export type OccurrenceImportTarget = z.infer<typeof OccurrenceImportTargetSchema>;
