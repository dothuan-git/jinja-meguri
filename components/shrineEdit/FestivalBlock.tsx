"use client";

import { useState } from "react";
import { Calendar, Compass, X } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  useShrineEdit,
  EditableText,
  EditableProse,
  EditableSelect,
  type ShrineEditApi,
} from "@/components/shrineEdit/context";
import { typo } from "@/components/shrineEdit/detailStyles";
import type { NamePair } from "@/lib/names";

/** View shape one festival block consumes — mirrors `toView()` festival entries in ShrineDetailView. */
export interface FestivalForBlock {
  id: string;
  name: string;
  name_ja: string;
  display: NamePair;
  time: string;
  origin: string;
  meaning: string;
  ritual: string;
  prayer: string;
  type: { category: string; notes: string };
}

const MONTH_VALUES = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0"));
// Festival default dates are recurring month-day values; the year is a placeholder
// (current year) so the stored value satisfies the YYYY-MM-DD contract column.
const DEFAULT_YEAR = String(new Date().getFullYear());
const dateSelect =
  "bg-torii/[0.04] outline-none rounded-sm border border-dashed border-torii/40 focus:border-torii px-1 py-0.5 text-[10px] font-mono tracking-wider text-torii-dark normal-case";

function splitMD(v: string): [string, string] {
  const m = v.match(/^\d{4}-(\d{2})-(\d{2})$/);
  return m ? [m[1], m[2]] : ["", ""];
}

/** Month + day picker for a festival's default (year-agnostic) start/end date. */
function DefaultDateField({ api, path, label }: { api: ShrineEditApi; path: string; label: string }) {
  const t = useTranslations("ShrineDetail.festival");
  const tMonths = useTranslations("MapFilters");
  const [m0, d0] = splitMD(api.getField(path));
  const [month, setMonth] = useState(m0);
  const [day, setDay] = useState(d0);
  const commit = (mo: string, dy: string) => {
    setMonth(mo);
    setDay(dy);
    // Only a complete month+day is a valid date; a partial selection stays null.
    api.setField(path, mo && dy ? `${DEFAULT_YEAR}-${mo}-${dy}` : "");
  };
  return (
    <label className="flex items-center gap-1.5">
      <span className="text-stone/40">{label} //</span>
      <select aria-label={`${label} ${t("month")}`} value={month} onChange={(e) => commit(e.target.value, day)} className={dateSelect}>
        <option value="">{t("month")}</option>
        {MONTH_VALUES.map((v) => (
          <option key={v} value={v}>{tMonths(`monthShort.${Number(v)}` as Parameters<typeof tMonths>[0])}</option>
        ))}
      </select>
      <select aria-label={`${label} ${t("day")}`} value={day} onChange={(e) => commit(month, e.target.value)} className={dateSelect}>
        <option value="">{t("day")}</option>
        {DAYS.map((d) => (
          <option key={d} value={d}>{Number(d)}</option>
        ))}
      </select>
    </label>
  );
}

/**
 * One festival's editorial block. Shared verbatim by the shrine detail page
 * (read + in-place edit) and the create-flow {@link FestivalCreateEditor}. All
 * fields bind to the draft by `festivals.${idx}.…`, so in edit/create mode the
 * passed `fest` only seeds the read-mode display. In create mode it also exposes
 * default start/end dates and an optional `onRemove` control.
 */
export default function FestivalBlock({
  fest,
  idx,
  onRemove,
}: {
  fest: FestivalForBlock;
  idx: number;
  onRemove?: () => void;
}) {
  const t = useTranslations("ShrineDetail.festival");
  const tEnums = useTranslations("Enums");
  const api = useShrineEdit();
  const editing = Boolean(api?.editing);
  const creating = api?.mode === "create";

  return (
    <div className="group relative space-y-6 pt-8 border-t border-stone/10 first:border-t-0 first:pt-0 transition-all">
      {/* Editorial Header */}
      <div className="space-y-3">
        <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-2 border-b border-stone/5 pb-2">
          <div className="flex items-baseline gap-2.5 flex-wrap">
            <span className="font-mono text-xs text-torii-dark font-bold tracking-widest select-none">
              0{idx + 1} //
            </span>
            <EditableText
              path={`festivals.${idx}.name_en`}
              ariaLabel={t("nameAria")}
              placeholder={t("namePh")}
              editClassName={`${typo.subheading} tracking-wide w-full`}
            >
              <h4 className={`${typo.subheading} tracking-wide select-text`}>
                {fest.display.main}
              </h4>
            </EditableText>
            <EditableText
              path={`festivals.${idx}.name_ja`}
              ariaLabel={t("nameJaAria")}
              placeholder={t("nameJaPh")}
              editClassName="text-base font-serif font-medium text-moss w-36"
            >
              {fest.display.sub && (
                <span className="text-base font-serif font-medium text-moss/70 select-text" style={{ fontFamily: "'Noto Serif JP', serif" }}>
                  ({fest.display.sub})
                </span>
              )}
            </EditableText>
            {/* Hiragana reading — edit-only input (read mode shows it via display). */}
            <EditableText
              path={`festivals.${idx}.name_hiragana`}
              ariaLabel={t("nameHiraganaAria")}
              placeholder={t("nameHiraganaPh")}
              editClassName="text-xs font-sans text-stone/70 w-32"
            >
              {null}
            </EditableText>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-1.5 text-xs font-mono tracking-widest font-bold text-stone/50 uppercase select-none">
              <Calendar size={13} className="text-stone/40" />
              <EditableText
                path={`festivals.${idx}.time_prose`}
                bilingual
                ariaLabel={t("timeAria")}
                placeholder={t("timePh")}
                editClassName="w-40 text-xs font-mono tracking-widest font-bold text-stone/60 uppercase"
              >
                <span>{fest.time}</span>
              </EditableText>
            </div>
            {onRemove && (
              <button
                type="button"
                aria-label={t("removeAria", { n: idx + 1 })}
                onClick={onRemove}
                className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-red-500 hover:text-red-700"
              >
                <X size={12} /> {t("remove")}
              </button>
            )}
          </div>
        </div>

        {/* Accent Metadata line */}
        <div className="flex items-center gap-1.5 text-[10px] font-mono tracking-widest uppercase font-bold text-stone/40 select-none">
          <span>{t("ritualType")}</span>
          <EditableSelect
            path={`festivals.${idx}.festival_type`}
            ariaLabel={t("typeAria")}
            options={[
              { value: "spectacle", label: t("typeSpectacle") },
              { value: "pilgrimage", label: t("typePilgrimage") },
            ]}
            className="text-[10px] font-mono tracking-widest uppercase font-bold text-torii-dark"
          >
            <span className="text-torii-dark bg-torii/5 border border-torii/10 px-1.5 py-0.5 rounded-sm">
              {fest.type.category === "spectacle" || fest.type.category === "pilgrimage"
                ? tEnums(`festivalType.${fest.type.category}`)
                : fest.type.category}
            </span>
          </EditableSelect>
        </div>

        {/* Default festival dates (recurring month-day) */}
        {(creating || editing) && api && (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[10px] font-mono tracking-widest uppercase font-bold pt-1">
            <DefaultDateField api={api} path={`festivals.${idx}.start_date`} label={t("startDate")} />
            <DefaultDateField api={api} path={`festivals.${idx}.end_date`} label={t("endDate")} />
          </div>
        )}
      </div>

      {/* Main Narrative — flows beautifully as professional typography */}
      <EditableProse
        path={`festivals.${idx}.meaning`}
        bilingual
        rows={8}
        ariaLabel={t("meaningAria")}
        placeholder={t("meaningPh")}
        editClassName="w-full text-xs md:text-sm font-sans text-stone/80"
      >
        <div className="space-y-4 text-justify select-text">
          {fest.meaning.split('\n\n').map((paragraph, pIdx) => (
            <p key={pIdx} className={typo.prose}>
              {paragraph}
            </p>
          ))}
        </div>
      </EditableProse>

      {/* Festival Origin — shown below meaning, no label */}
      {(editing || fest.origin) && (
        <EditableProse
          path={`festivals.${idx}.origin`}
          bilingual
          rows={4}
          ariaLabel={t("originAria")}
          placeholder={t("originPh")}
          editClassName="w-full text-xs md:text-sm font-sans text-stone/80"
        >
          <p className={`${typo.prose} select-text`}>
            {fest.origin}
          </p>
        </EditableProse>
      )}

      {/* Ritual Sequence & Pilgrim Aspirations - Clean columns with accent left lines rather than cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2">
        <div className="space-y-2">
          <h5 className={`${typo.eyebrow} flex items-center gap-2 select-none`}>
            <span className="w-1.5 h-1.5 rounded-full bg-moss-light/40"></span>
            {t("ceremoniesRituals")}
          </h5>
          <EditableProse
            path={`festivals.${idx}.ritual`}
            bilingual
            rows={5}
            ariaLabel={t("ritualAria")}
            placeholder={t("ritualPh")}
            editClassName="w-full text-xs md:text-sm font-sans text-stone/80"
          >
            <p className={`${typo.prose} pl-3.5 border-l border-stone/15 select-text`}>
              {fest.ritual}
            </p>
          </EditableProse>
        </div>

        {(editing || fest.prayer) && (
          <div className="space-y-2">
            <h5 className={`${typo.eyebrow} flex items-center gap-2 select-none`}>
              <span className="w-1.5 h-1.5 rounded-full bg-torii"></span>
              {t("prayersIntentions")}
            </h5>
            <EditableProse
              path={`festivals.${idx}.prayer`}
              bilingual
              rows={5}
              ariaLabel={t("prayerAria")}
              placeholder={t("prayerPh")}
              editClassName="w-full text-xs md:text-sm font-quote italic text-stone/75"
            >
              <p className={`${typo.lore} text-justify select-text`}>
                {fest.prayer}
              </p>
            </EditableProse>
          </div>
        )}
      </div>

      {/* Pilgrim Advisory - minimalist subtle card to separate it clearly as an instruction */}
      <div className="bg-stone/5 px-4 py-3 border border-stone/10 rounded-sm flex items-start gap-2.5">
        <Compass size={14} className="text-torii-dark/70 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <span className={`${typo.fieldLabel} block mb-1 select-none`}>
            {t("visitorTips")}
          </span>
          <EditableProse
            path={`festivals.${idx}.visitor_notes`}
            bilingual
            rows={4}
            ariaLabel={t("notesAria")}
            placeholder={t("notesPh")}
            editClassName="w-full text-xs md:text-sm font-sans text-stone/80"
          >
            <p className={`${typo.prose} select-text`}>
              {fest.type.notes}
            </p>
          </EditableProse>
        </div>
      </div>
    </div>
  );
}
