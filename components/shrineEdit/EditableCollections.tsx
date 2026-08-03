"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { useShrineEdit } from "@/components/shrineEdit/context";
import { typo } from "@/components/shrineEdit/detailStyles";

/**
 * Collection editors for the in-place shrine editor. Like the scalar primitives
 * in {@link ./context}, each renders its read-only `children` unchanged on the
 * public path (no provider) and a draft-bound editor when editing.
 */

type ChipKind = "ranks" | "prayerCategories";
const CHIP_PATH: Record<ChipKind, "ranks" | "prayer_categories"> = {
  ranks: "ranks",
  prayerCategories: "prayer_categories",
};
const CHIP_NOUN: Record<ChipKind, string> = {
  ranks: "rank",
  prayerCategories: "prayer category",
};

const editChip =
  "inline-flex items-center gap-1 rounded-md border border-torii/30 bg-torii/[0.06] px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider text-stone/80";
const editPlus =
  "inline-flex items-center gap-0.5 rounded-md border border-dashed border-torii/40 px-1.5 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider text-torii transition-colors hover:bg-torii/5";

/** Catalog-bound multi-value field (ranks, prayer categories): chips with X + a `+` that reveals a picker. */
export function EditableChips({
  kind,
  label,
  children,
}: {
  kind: ChipKind;
  /** Small leading label, shown in the create flow where empty chips lack surrounding context. */
  label?: string;
  children: React.ReactNode;
}) {
  const api = useShrineEdit();
  const [adding, setAdding] = useState(false);
  if (!api?.editing) return <>{children}</>;

  const path = CHIP_PATH[kind];
  const selected = (api.getValue(path) as string[] | undefined) ?? [];
  const available = api.catalogs[kind].filter((o) => !selected.includes(o));

  const remove = (value: string) => api.setValue(path, selected.filter((v) => v !== value));
  const add = (value: string) => {
    if (value && !selected.includes(value)) api.setValue(path, [...selected, value]);
    setAdding(false);
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {api.mode === "create" && label && (
        <span className={`${typo.fieldLabel} mr-1 select-none`}>{label}</span>
      )}
      {selected.map((value) => (
        <span key={value} className={editChip}>
          <span>{value}</span>
          <button
            type="button"
            aria-label={`Remove ${value}`}
            onClick={() => remove(value)}
            className="text-stone/40 transition-colors hover:text-torii"
          >
            <X size={11} />
          </button>
        </span>
      ))}
      {adding ? (
        <select
          autoFocus
          aria-label={`Add ${CHIP_NOUN[kind]}`}
          defaultValue=""
          onChange={(e) => add(e.target.value)}
          onBlur={() => setAdding(false)}
          className="rounded-md border border-dashed border-torii/40 bg-torii/[0.04] px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider text-stone/80 outline-none focus:border-torii"
        >
          <option value="" disabled>
            — select —
          </option>
          {available.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : (
        available.length > 0 && (
          <button
            type="button"
            aria-label={`Add ${CHIP_NOUN[kind]}`}
            onClick={() => setAdding(true)}
            className={editPlus}
          >
            <Plus size={11} />
          </button>
        )
      )}
    </div>
  );
}

type SourceItem = { url: string; title?: string | null; title_ja?: string | null };
const sourceInput =
  "w-full rounded-sm border border-dashed border-torii/30 bg-torii/[0.04] px-2 py-1 text-xs font-mono text-stone/80 outline-none placeholder:text-stone/30 focus:border-torii";

/** Source list editor: title + url rows with X delete and a `+ Add source` button. */
export function EditableSources({ children }: { children: React.ReactNode }) {
  const api = useShrineEdit();
  if (!api?.editing) return <>{children}</>;

  const sources = (api.getValue("sources") as SourceItem[] | undefined) ?? [];
  const update = (i: number, patch: Partial<SourceItem>) =>
    api.setValue("sources", sources.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const remove = (i: number) => api.setValue("sources", sources.filter((_, j) => j !== i));
  const add = () => api.setValue("sources", [...sources, { url: "", title: "", title_ja: "" }]);

  return (
    <div className="space-y-2">
      {sources.map((s, i) => (
        <div key={i} className="flex items-start gap-2">
          <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
            <input
              value={s.title ?? ""}
              onChange={(e) => update(i, { title: e.target.value })}
              placeholder="Title"
              aria-label={`Source ${i + 1} title`}
              className={sourceInput}
            />
            <input
              value={s.title_ja ?? ""}
              onChange={(e) => update(i, { title_ja: e.target.value })}
              placeholder="Title (JA)"
              aria-label={`Source ${i + 1} title (Japanese)`}
              className={sourceInput}
            />
            <input
              value={s.url}
              onChange={(e) => update(i, { url: e.target.value })}
              placeholder="https://…"
              aria-label={`Source ${i + 1} URL`}
              className={`${sourceInput} sm:col-span-2`}
            />
          </div>
          <button
            type="button"
            aria-label={`Remove source ${i + 1}`}
            onClick={() => remove(i)}
            className="mt-1 text-stone/40 transition-colors hover:text-torii"
          >
            <X size={13} />
          </button>
        </div>
      ))}
      <button type="button" onClick={add} className={editPlus}>
        <Plus size={11} />
        <span>Add source</span>
      </button>
    </div>
  );
}
