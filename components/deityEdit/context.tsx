"use client";

import { createContext, useContext } from "react";
import type { DeityInput } from "@/lib/admin/deityContract";

/**
 * In-place edit API for the deity carousel editor, shared between
 * {@link DeityEditProvider} (admin-only) and {@link DeityCardBody}. When no
 * provider is mounted (public / read path) {@link useDeityEdit} returns `null`,
 * so the card renders read-only and ships no edit behavior.
 *
 * The deity draft is a flat 5-field object, so this is a simple `draft`/`update`
 * surface rather than the dotted-path API the shrine editor needs.
 */
export interface DeityEditApi {
  editing: boolean;
  mode: "create" | "update";
  draft: DeityInput;
  update: (patch: Partial<DeityInput>) => void;
  /** Which language the bilingual canonical fields (lore, titles, sphere) bind to. */
  editLang: "en" | "ja";
  setEditLang: (lang: "en" | "ja") => void;
}

export const DeityEditContext = createContext<DeityEditApi | null>(null);

export function useDeityEdit(): DeityEditApi | null {
  return useContext(DeityEditContext);
}
