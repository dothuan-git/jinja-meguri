"use client";

import { Plus, Sparkles, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useShrineEdit, EditableText, EditableProse } from "@/components/shrineEdit/context";
import { typo } from "@/components/shrineEdit/detailStyles";
import type { ShrineInput } from "@/lib/admin/shrineContract";

type HighlightDraft = NonNullable<ShrineInput["highlights"]>[number];

/**
 * "Don't-miss" highlights, rendered directly under the shrine description in
 * Chapter I. In read mode it lists the canonical {@link highlights} (title +
 * optional short gloss); in edit/create mode it becomes a draft-driven add/remove
 * editor binding each item to `highlights.${i}.title` / `.body`. Hidden entirely
 * when there are no highlights and no editor is mounted.
 */
export default function HighlightsEditor({
  highlights,
}: {
  highlights: { title: string; body: string | null }[];
}) {
  const api = useShrineEdit();
  const editing = Boolean(api?.editing);
  const t = useTranslations("ShrineDetail.highlights");
  const tRemove = useTranslations("ShrineDetail");

  if (!editing) {
    if (highlights.length === 0) return null;
    return (
      <div className="space-y-2.5 pt-4">
        <h4 className={`${typo.eyebrow} flex items-center gap-1.5 select-none`}>
          <Sparkles size={12} className="text-torii-dark/70" />
          {t("title")}
        </h4>
        <ul className="space-y-2">
          {highlights.map((h, i) => (
            <li key={i} className="flex gap-2 text-xs md:text-sm leading-relaxed select-text">
              <span className="text-torii-dark/60 select-none">•</span>
              <span className="font-sans text-stone/85">
                <span className="font-bold text-stone">{h.title}</span>
                {h.body ? <span className="text-stone/75"> — {h.body}</span> : null}
              </span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const draft = (api!.getValue("highlights") as HighlightDraft[] | undefined) ?? [];
  const setDraft = (next: HighlightDraft[]) => api!.setValue("highlights", next);

  return (
    <div className="space-y-3 pt-4">
      <h4 className={`${typo.eyebrow} flex items-center gap-1.5 select-none`}>
        <Sparkles size={12} className="text-torii-dark/70" />
        {t("title")}
      </h4>

      {draft.length === 0 && (
        <p className="text-xs text-stone/40 font-sans italic">
          {t("empty")}
        </p>
      )}

      {draft.map((h, i) => (
        <div key={i} className="flex items-start gap-2 border-l border-torii/20 pl-3">
          <div className="flex-1 space-y-1.5">
            <EditableText
              path={`highlights.${i}.title`}
              bilingual
              ariaLabel={t("titleAria", { n: i + 1 })}
              placeholder={t("titlePh")}
              editClassName="w-full text-sm font-sans font-bold text-stone"
            >
              <span>{h.title}</span>
            </EditableText>
            <EditableProse
              path={`highlights.${i}.body`}
              bilingual
              rows={2}
              ariaLabel={t("bodyAria", { n: i + 1 })}
              placeholder={t("bodyPh")}
              editClassName="w-full text-xs md:text-sm font-sans text-stone/80"
            >
              <>{h.body}</>
            </EditableProse>
          </div>
          <button
            type="button"
            aria-label={t("removeAria", { n: i + 1 })}
            onClick={() => setDraft(draft.filter((_, j) => j !== i))}
            className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-red-500 hover:text-red-700 shrink-0"
          >
            <X size={12} /> {tRemove("remove")}
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={() => setDraft([...draft, { title: "", body: "" }])}
        className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-torii/40 px-3 py-1.5 text-[11px] font-mono font-bold uppercase tracking-wider text-torii transition-colors hover:bg-torii/5"
      >
        <Plus size={13} /> {t("add")}
      </button>
    </div>
  );
}
