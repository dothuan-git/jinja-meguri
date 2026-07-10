"use client";

import { createContext, useContext } from "react";
import type { EditCatalogs } from "@/lib/types";

/**
 * In-place edit API shared between {@link ShrineEditProvider} (admin-only, lazy)
 * and the editable primitives below. When no provider is mounted (public / read
 * path) {@link useShrineEdit} returns `null`, so every primitive renders its
 * read-only children unchanged and ships no edit behavior.
 *
 * Field paths are dotted, resolved against the draft `ShrineInput` and support
 * array indices: `"name_en"`, `"details.history"`, `"festivals.0.meaning"`,
 * `"deities.2.regional_lore"`.
 */
export interface ShrineEditApi {
  editing: boolean;
  /** "create" = brand-new shrine (slug editable, draft-driven deity/festival editors); "update" = in-place edit. */
  mode: "create" | "update";
  getField: (path: string) => string;
  setField: (path: string, value: string) => void;
  /** Raw draft value at a path (no string coercion) — for array/collection fields. */
  getValue: (path: string) => unknown;
  /** Raw draft set at a path (no `"" → null` coercion) — for arrays and the prefecture/region strings. */
  setValue: (path: string, value: unknown) => void;
  /** Index of a deity in the draft by its kanji name (the unique dedup key); -1 if absent. */
  findDeityIndex: (nameJa: string) => number;
  /** Catalog option lists for the bounded dropdowns (ranks, categories, prefectures). */
  catalogs: EditCatalogs;
  /** Which language the `bilingual` prose primitives currently bind to. */
  editLang: "en" | "ja";
  setEditLang: (lang: "en" | "ja") => void;
}

export const ShrineEditContext = createContext<ShrineEditApi | null>(null);

export function useShrineEdit(): ShrineEditApi | null {
  return useContext(ShrineEditContext);
}

// For a bilingual prose field, JA mode binds to the `_ja` sibling column by
// appending `_ja` to the dotted path's leaf: `details.history` → `details.history_ja`,
// `festivals.0.meaning` → `festivals.0.meaning_ja`. Exported for the hand-rolled
// array editors (deity alter_titles / regional_lore) that bind to the draft
// directly instead of through EditableText/EditableProse.
export function resolvePath(path: string, bilingual: boolean, editLang: "en" | "ja"): string {
  if (!bilingual || editLang !== "ja") return path;
  return path.replace(/([^.]+)$/, "$1_ja");
}

const editBase =
  "bg-torii/[0.04] outline-none rounded-sm transition-colors placeholder:text-stone/30";

/** Single-line text field (names, city, festival name/time). */
export function EditableText({
  path,
  children,
  className,
  editClassName,
  placeholder,
  ariaLabel,
  bilingual = false,
}: {
  path: string;
  children: React.ReactNode;
  /** Read-mode text classes; also applied to the input unless `editClassName` is set. */
  className?: string;
  editClassName?: string;
  placeholder?: string;
  ariaLabel?: string;
  /** When true, JA edit-language binds to the `_ja` sibling column. */
  bilingual?: boolean;
}) {
  const api = useShrineEdit();
  if (!api?.editing) return <>{children}</>;
  const p = resolvePath(path, bilingual, api.editLang);
  return (
    <input
      aria-label={ariaLabel}
      value={api.getField(p)}
      onChange={(e) => api.setField(p, e.target.value)}
      placeholder={placeholder}
      className={`${editClassName ?? className ?? ""} ${editBase} border-b border-dashed border-torii/40 focus:border-torii px-1`}
    />
  );
}

/** Multi-line prose field (quote, description, history, festival narrative, deity lore). */
export function EditableProse({
  path,
  children,
  className,
  editClassName,
  rows = 3,
  placeholder,
  ariaLabel,
  bilingual = false,
}: {
  path: string;
  children: React.ReactNode;
  className?: string;
  editClassName?: string;
  rows?: number;
  placeholder?: string;
  ariaLabel?: string;
  /** When true, JA edit-language binds to the `_ja` sibling column. */
  bilingual?: boolean;
}) {
  const api = useShrineEdit();
  if (!api?.editing) return <>{children}</>;
  const p = resolvePath(path, bilingual, api.editLang);
  // Leaf segment of the resolved path = the DB column name (shows the _ja suffix in JA mode).
  const fieldName = p.split(".").pop() ?? p;
  return (
    <span className="block">
      <span className="mb-0.5 block text-[9px] font-mono uppercase tracking-wider text-stone/40">
        {fieldName}
      </span>
      <textarea
        aria-label={ariaLabel}
        value={api.getField(p)}
        onChange={(e) => api.setField(p, e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className={`${editClassName ?? className ?? ""} ${editBase} block w-full border border-dashed border-torii/30 focus:border-torii p-2 resize-y`}
      />
    </span>
  );
}

/** Bounded-choice field (festival type). */
export function EditableSelect({
  path,
  options,
  children,
  className,
  ariaLabel,
}: {
  path: string;
  options: { value: string; label: string }[];
  children: React.ReactNode;
  className?: string;
  ariaLabel?: string;
}) {
  const api = useShrineEdit();
  if (!api?.editing) return <>{children}</>;
  return (
    <select
      aria-label={ariaLabel}
      value={api.getField(path)}
      onChange={(e) => api.setField(path, e.target.value)}
      className={`${className ?? ""} ${editBase} border border-dashed border-torii/40 focus:border-torii px-1 py-0.5`}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
