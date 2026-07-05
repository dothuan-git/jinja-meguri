"use client";

import { Plus } from "lucide-react";
import { useShrineEdit } from "@/components/shrineEdit/context";
import FestivalBlock, { type FestivalForBlock } from "@/components/shrineEdit/FestivalBlock";
import type { ShrineInput } from "@/lib/admin/shrineContract";

type FestivalDraft = NonNullable<ShrineInput["festivals"]>[number];

function emptyFestival(): FestivalDraft {
  return { name_en: "", name_ja: "", time_prose: "", festival_type: "spectacle", occurrences: [] };
}

// Draft festival → the view shape FestivalBlock reads (content only seeds read mode;
// every field is editable by `festivals.${idx}.…` in create mode).
function toBlock(f: FestivalDraft, i: number): FestivalForBlock {
  return {
    id: String(i),
    name: f.name_en ?? "",
    name_ja: f.name_ja ?? "",
    time: f.time_prose ?? "",
    origin: f.origin ?? "",
    meaning: f.meaning ?? "",
    ritual: f.ritual ?? "",
    prayer: f.prayer ?? "",
    type: { category: f.festival_type ?? "", notes: f.visitor_notes ?? "" },
  };
}

/**
 * Draft-driven festival editor shared by the create flow and in-place shrine
 * editing: add/remove festivals, each rendered with the shared {@link FestivalBlock}
 * so it reads identically to the detail page. Dates (festival_occurrences) are
 * deferred and not collected here.
 */
export default function FestivalCreateEditor() {
  const api = useShrineEdit();
  if (!api) return null;

  const festivals = (api.getValue("festivals") as FestivalDraft[] | undefined) ?? [];
  const setFestivals = (next: FestivalDraft[]) => api.setValue("festivals", next);

  return (
    <>
      {festivals.length === 0 && (
        <p className="text-xs text-stone/40 font-sans italic">
          No festivals yet — optional. Add one if this shrine holds a notable matsuri.
        </p>
      )}

      {festivals.map((f, i) => (
        <FestivalBlock
          key={i}
          fest={toBlock(f, i)}
          idx={i}
          onRemove={() => setFestivals(festivals.filter((_, j) => j !== i))}
        />
      ))}

      <button
        type="button"
        onClick={() => setFestivals([...festivals, emptyFestival()])}
        className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-torii/40 px-3 py-1.5 text-[11px] font-mono font-bold uppercase tracking-wider text-torii transition-colors hover:bg-torii/5"
      >
        <Plus size={13} /> Add festival
      </button>
    </>
  );
}
