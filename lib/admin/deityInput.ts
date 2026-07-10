import type { Store } from "@/lib/types";
import type { DeityInput } from "@/lib/admin/deityContract";

/**
 * Empty draft seed for the create-on-carousel flow. `name_en`/`name_ja` are
 * required by the contract but start blank; the server validates on save.
 */
export function emptyDeityInput(): DeityInput {
  return {
    name_en: "",
    name_ja: "",
    deity_type: "mythological",
    titles: [],
    titles_ja: null,
    canonical_lore: null,
    canonical_lore_ja: null,
    mythic_sphere: null,
    mythic_sphere_ja: null,
  };
}

/**
 * Build the editable `DeityInput` for one deity directly from the **raw Store
 * row** (both languages, `*` + `*_ja`). Like {@link buildShrineInput}, this
 * bypasses the localized view model so editing never writes the displayed
 * language back into the English columns. The deity's `id` is carried separately
 * by {@link DeityEditProvider} (needed for `updateDeity`).
 */
export function buildDeityInput(store: Store, deityId: string): DeityInput | null {
  const d = store.deities.find((x) => x.id === deityId);
  if (!d) return null;
  return {
    name_en: d.name_en,
    name_ja: d.name_ja ?? "",
    deity_type: d.deity_type as DeityInput["deity_type"],
    titles: d.titles ?? [],
    titles_ja: d.titles_ja,
    canonical_lore: d.canonical_lore,
    canonical_lore_ja: d.canonical_lore_ja,
    mythic_sphere: d.mythic_sphere,
    mythic_sphere_ja: d.mythic_sphere_ja,
  };
}

/** Admin-only edit seeds: id → raw-row DeityInput for the carousel editor. */
export function buildDeityEditSeeds(store: Store): Record<string, DeityInput> {
  const seeds: Record<string, DeityInput> = {};
  for (const d of store.deities) seeds[d.id] = buildDeityInput(store, d.id)!;
  return seeds;
}
