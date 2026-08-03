import { z } from "zod";

export const DEITY_TYPES = ["mythological", "deified_human", "syncretic"] as const;

// Standalone canonical deity. name_ja is the kanji dedup key shrines match against,
// so it is required here (the DB column is UNIQUE; nullable only for legacy rows).
export const DeityInputSchema = z.object({
  name_en: z.string().min(1),
  name_ja: z.string().min(1, "name_ja (kanji dedup key) is required"),
  name_hiragana: z.string().nullable().optional(),
  deity_type: z.enum(DEITY_TYPES),
  titles: z.array(z.string()).nullable().optional(),
  titles_ja: z.array(z.string()).nullable().optional(),
  canonical_lore: z.string().nullable().optional(),
  canonical_lore_ja: z.string().nullable().optional(),
  mythic_sphere: z.string().nullable().optional(),
  mythic_sphere_ja: z.string().nullable().optional(),
});

export type DeityInput = z.infer<typeof DeityInputSchema>;
