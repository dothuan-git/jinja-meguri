import { z } from "zod";

const OccurrenceSchema = z.object({
  year: z.number().int().min(2020).max(2100),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD").nullable().optional(),
  notes: z.string().nullable().optional(),
});

const FestivalSchema = z.object({
  name_en: z.string().min(1),
  name_ja: z.string().nullable().optional(),
  time_prose: z.string().nullable().optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  origin: z.string().nullable().optional(),
  meaning: z.string().nullable().optional(),
  ritual: z.string().nullable().optional(),
  prayer: z.string().nullable().optional(),
  festival_type: z.enum(["spectacle", "pilgrimage"]).nullable().optional(),
  visitor_notes: z.string().nullable().optional(),
  occurrences: z.array(OccurrenceSchema).optional(),
});

const DeityCanonicalSchema = z.object({
  name_en: z.string().min(1),
  name_ja: z.string().nullable().optional(),
  deity_type: z.enum(["mythological", "deified_human", "syncretic"]),
  titles: z.array(z.string()).nullable().optional(),
  canonical_lore: z.string().nullable().optional(),
});

const DeitySchema = z.object({
  name_ja: z.string().min(1, "Deity name_ja (kanji dedup key) is required"),
  is_primary: z.boolean(),
  sort_order: z.number().int().min(0).default(0),
  regional_lore: z.string().nullable().optional(),
  // Only required when the deity doesn't exist in the DB yet
  canonical: DeityCanonicalSchema.optional(),
});

const SourceSchema = z.object({
  url: z.string().url(),
  title: z.string().nullable().optional(),
});

export const ShrineInputSchema = z.object({
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, "slug must be lowercase letters, digits, or hyphens"),
  name_en: z.string().min(1),
  name_ja: z.string().nullable().optional(),
  region: z.string().min(1),
  prefecture: z.string().min(1),
  city: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  coordinates: z.object({
    lat: z.number(),
    lng: z.number(),
  }).nullable().optional(),
  image_urls: z.array(z.string().url()).nullable().optional(),
  details: z.object({
    history: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    prayer_focus: z.string().nullable().optional(),
    best_time: z.string().nullable().optional(),
  }).optional(),
  ranks: z.array(z.string()).optional(),
  prayer_categories: z.array(z.string()).optional(),
  deities: z.array(DeitySchema).min(1, "At least one deity is required"),
  festivals: z.array(FestivalSchema).optional(),
  sources: z.array(SourceSchema).optional(),
}).superRefine((data, ctx) => {
  const primaryCount = data.deities.filter((d) => d.is_primary).length;
  if (primaryCount === 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Exactly one deity must be primary", path: ["deities"] });
  }
  if (primaryCount > 1) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Only one deity can be primary", path: ["deities"] });
  }
  const pilgrimageCount = (data.festivals ?? []).filter((f) => f.festival_type === "pilgrimage").length;
  if (pilgrimageCount > 2) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Maximum 2 pilgrimage-type festivals per shrine", path: ["festivals"] });
  }
});

export type ShrineInput = z.infer<typeof ShrineInputSchema>;
