"use client";

import { useState } from "react";
import { Calendar, Compass, X } from "lucide-react";
import {
  useShrineEdit,
  EditableText,
  EditableProse,
  EditableSelect,
  type ShrineEditApi,
} from "@/components/shrineEdit/context";
import { typo } from "@/components/shrineEdit/detailStyles";
import { FESTIVAL_TYPE_LABEL } from "@/lib/labels";

/** View shape one festival block consumes — mirrors `toView()` festival entries in ShrineDetailView. */
export interface FestivalForBlock {
  id: string;
  name: string;
  name_ja: string;
  time: string;
  origin: string;
  meaning: string;
  ritual: string;
  prayer: string;
  type: { category: string; notes: string };
}

const MONTHS: [string, string][] = [
  ["01", "Jan"], ["02", "Feb"], ["03", "Mar"], ["04", "Apr"], ["05", "May"], ["06", "Jun"],
  ["07", "Jul"], ["08", "Aug"], ["09", "Sep"], ["10", "Oct"], ["11", "Nov"], ["12", "Dec"],
];
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
      <select aria-label={`${label} month`} value={month} onChange={(e) => commit(e.target.value, day)} className={dateSelect}>
        <option value="">Month</option>
        {MONTHS.map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>
      <select aria-label={`${label} day`} value={day} onChange={(e) => commit(month, e.target.value)} className={dateSelect}>
        <option value="">Day</option>
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
              ariaLabel="Festival name"
              placeholder="Festival name (English)"
              editClassName={`${typo.subheading} tracking-wide w-full`}
            >
              <h4 className={`${typo.subheading} tracking-wide select-text`}>
                {fest.name}
              </h4>
            </EditableText>
            <EditableText
              path={`festivals.${idx}.name_ja`}
              ariaLabel="Festival name (Japanese)"
              placeholder="祭名（漢字）"
              editClassName="text-base font-serif font-medium text-moss w-36"
            >
              {fest.name_ja && (
                <span className="text-base font-serif font-medium text-moss/70 select-text" style={{ fontFamily: "'Noto Serif JP', serif" }}>
                  ({fest.name_ja})
                </span>
              )}
            </EditableText>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-1.5 text-xs font-mono tracking-widest font-bold text-stone/50 uppercase select-none">
              <Calendar size={13} className="text-stone/40" />
              <EditableText
                path={`festivals.${idx}.time_prose`}
                ariaLabel="Festival time"
                placeholder="e.g. First Sunday of May"
                editClassName="w-40 text-xs font-mono tracking-widest font-bold text-stone/60 uppercase"
              >
                <span>{fest.time}</span>
              </EditableText>
            </div>
            {onRemove && (
              <button
                type="button"
                aria-label={`Remove festival ${idx + 1}`}
                onClick={onRemove}
                className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-red-500 hover:text-red-700"
              >
                <X size={12} /> Remove
              </button>
            )}
          </div>
        </div>

        {/* Accent Metadata line */}
        <div className="flex items-center gap-1.5 text-[10px] font-mono tracking-widest uppercase font-bold text-stone/40 select-none">
          <span>Ritual Type //</span>
          <EditableSelect
            path={`festivals.${idx}.festival_type`}
            ariaLabel="Festival type"
            options={[
              { value: "spectacle", label: "Spectacle" },
              { value: "pilgrimage", label: "Pilgrimage" },
            ]}
            className="text-[10px] font-mono tracking-widest uppercase font-bold text-torii-dark"
          >
            <span className="text-torii-dark bg-torii/5 border border-torii/10 px-1.5 py-0.5 rounded-sm">
              {FESTIVAL_TYPE_LABEL[fest.type.category] ?? fest.type.category}
            </span>
          </EditableSelect>
        </div>

        {/* Default festival dates (recurring month-day) */}
        {(creating || editing) && api && (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[10px] font-mono tracking-widest uppercase font-bold pt-1">
            <DefaultDateField api={api} path={`festivals.${idx}.start_date`} label="Start date" />
            <DefaultDateField api={api} path={`festivals.${idx}.end_date`} label="End date" />
          </div>
        )}
      </div>

      {/* Main Narrative — flows beautifully as professional typography */}
      <EditableProse
        path={`festivals.${idx}.meaning`}
        rows={8}
        ariaLabel="Festival meaning"
        placeholder="What the festival means / its significance…"
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
          rows={4}
          ariaLabel="Festival origin"
          placeholder="Festival origins & history…"
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
            Ceremonies & Rituals
          </h5>
          <EditableProse
            path={`festivals.${idx}.ritual`}
            rows={5}
            ariaLabel="Festival ritual"
            placeholder="Ceremonies & rituals…"
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
              Prayers & Intentions
            </h5>
            <EditableProse
              path={`festivals.${idx}.prayer`}
              rows={5}
              ariaLabel="Festival prayer"
              placeholder="Prayers & intentions…"
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
            Visitor Tips & Etiquette
          </span>
          <EditableProse
            path={`festivals.${idx}.visitor_notes`}
            rows={4}
            ariaLabel="Festival visitor notes"
            placeholder="Visitor tips & etiquette…"
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
