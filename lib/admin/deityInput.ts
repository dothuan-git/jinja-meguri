import type { DeityListItem } from "@/lib/types";
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
    canonical_lore: null,
    mythic_sphere: null,
  };
}

/**
 * Reconstruct the editable `DeityInput` from a `DeityListItem` so the in-place
 * carousel editor can be pre-filled from the same rendered data. The deity's
 * `id` is carried separately by {@link DeityEditProvider} (needed for
 * `updateDeity`); `DeityInput` itself has no id.
 */
export function deityListItemToInput(d: DeityListItem): DeityInput {
  return {
    name_en: d.name_en,
    name_ja: d.name_ja ?? "",
    deity_type: d.deity_type as DeityInput["deity_type"],
    titles: d.titles,
    canonical_lore: d.canonical_lore,
    mythic_sphere: d.mythic_sphere,
  };
}
