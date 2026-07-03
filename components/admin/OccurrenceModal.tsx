"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { CalendarDays, ListPlus, FileJson, Plus, Trash2, X, Upload } from "lucide-react";
import type { FestivalOccurrenceRow } from "@/lib/types";
import { useOccurrenceSave } from "@/components/admin/useOccurrenceSave";
import SearchSelect from "@/components/admin/SearchSelect";

export interface OccurrenceShrineOption {
  shrine_slug: string;
  shrine_name_en: string;
  festivals: { festival_id: string; name_en: string; name_ja: string | null }[];
}

interface FormRow {
  key: string;
  shrineSlug: string;
  festivalId: string;
  startDate: string;
  endDate: string;
  notes: string;
}

const JSON_PLACEHOLDER = `[
  {
    "shrine_slug": "fushimi-inari-taisha",
    "festival_name_en": "Hatsuuma Taisai",
    "occurrences": [
      { "year": 2026, "start_date": "2026-02-08", "end_date": null, "notes": null }
    ]
  }
]`;

const inputBase =
  "w-full rounded-sm border border-dashed border-torii/30 bg-torii/[0.04] px-2 py-1.5 text-xs font-mono text-stone/80 outline-none placeholder:text-stone/30 focus:border-torii transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

function emptyRow(key: string): FormRow {
  return { key, shrineSlug: "", festivalId: "", startDate: "", endDate: "", notes: "" };
}

function prefill(
  seed: FestivalOccurrenceRow[],
  festivalId: string,
  year: number,
): { startDate: string; endDate: string; notes: string } {
  const occ = seed.find((o) => o.festival_id === festivalId && o.year === year);
  return occ
    ? { startDate: occ.start_date, endDate: occ.end_date ?? "", notes: occ.notes ?? "" }
    : { startDate: "", endDate: "", notes: "" };
}

export default function OccurrenceModal({
  open,
  onClose,
  shrineOptions,
  occurrenceSeed,
  defaultYear,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  shrineOptions: OccurrenceShrineOption[];
  occurrenceSeed: FestivalOccurrenceRow[];
  defaultYear: number;
  onSaved: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [activeTab, setActiveTab] = useState<"form" | "json">("form");
  const rowKeySeq = useRef(0);
  const [year, setYear] = useState(defaultYear);
  const [rows, setRows] = useState<FormRow[]>([emptyRow("0")]);
  const [formError, setFormError] = useState<string | null>(null);
  const [jsonText, setJsonText] = useState(JSON_PLACEHOLDER);

  useEffect(() => {
    if (!open) return;
    rowKeySeq.current = 1;
    setActiveTab("form");
    setYear(defaultYear);
    setRows([emptyRow("0")]);
    setFormError(null);
    setJsonText(JSON_PLACEHOLDER);
  }, [open, defaultYear]);

  const { save, saving } = useOccurrenceSave({
    onSaved: () => {
      onSaved();
    },
  });

  function setRowShrine(idx: number, shrineSlug: string) {
    setRows((prev) =>
      prev.map((r, i) => (i === idx ? { ...emptyRow(r.key), shrineSlug } : r)),
    );
  }

  function setRowFestival(idx: number, festivalId: string) {
    setRows((prev) =>
      prev.map((r, i) =>
        i === idx ? { ...r, festivalId, ...prefill(occurrenceSeed, festivalId, year) } : r,
      ),
    );
  }

  function setYearAndPrefill(nextYear: number) {
    setYear(nextYear);
    setRows((prev) =>
      prev.map((r) => (r.festivalId ? { ...r, ...prefill(occurrenceSeed, r.festivalId, nextYear) } : r)),
    );
  }

  function setRowField(idx: number, field: "startDate" | "endDate" | "notes", val: string) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: val } : r)));
  }

  function addRow() {
    rowKeySeq.current += 1;
    setRows((prev) => [...prev, emptyRow(String(rowKeySeq.current))]);
  }

  function removeRow(idx: number) {
    setRows((prev) => prev.filter((_, i) => i !== idx));
  }

  function buildTargets(): { targets: unknown[] } | { error: string } {
    const targets: {
      shrine_slug: string;
      festival_name_en: string;
      occurrences: { year: number; start_date: string; end_date: string | null; notes: string | null }[];
    }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const isBlank = !r.shrineSlug && !r.festivalId && !r.startDate.trim() && !r.endDate.trim() && !r.notes.trim();
      if (isBlank) continue;
      if (!r.shrineSlug) return { error: `Row ${i + 1}: choose a shrine.` };
      if (!r.festivalId) return { error: `Row ${i + 1}: choose a festival.` };
      if (!r.startDate.trim()) return { error: `Row ${i + 1}: enter a start date.` };

      const shrine = shrineOptions.find((s) => s.shrine_slug === r.shrineSlug);
      const festival = shrine?.festivals.find((f) => f.festival_id === r.festivalId);
      if (!shrine || !festival) return { error: `Row ${i + 1}: invalid shrine/festival.` };

      targets.push({
        shrine_slug: shrine.shrine_slug,
        festival_name_en: festival.name_en,
        occurrences: [
          { year, start_date: r.startDate, end_date: r.endDate.trim() || null, notes: r.notes.trim() || null },
        ],
      });
    }

    if (targets.length === 0) return { error: "Add at least one festival row." };
    return { targets };
  }

  function handleFormSave() {
    const result = buildTargets();
    if ("error" in result) {
      setFormError(result.error);
      return;
    }
    setFormError(null);
    save(result.targets);
  }

  const jsonParsed = useMemo(() => {
    try {
      return { data: JSON.parse(jsonText) as unknown, error: null as string | null };
    } catch {
      return { data: null, error: "Not valid JSON — check your input." };
    }
  }, [jsonText]);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setJsonText(String(reader.result ?? ""));
    reader.readAsText(file);
    e.target.value = "";
  }

  function handleJsonSave() {
    if (jsonParsed.error || jsonParsed.data === null) return;
    save(jsonParsed.data);
  }

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -6 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="w-full max-w-2xl max-h-[88vh] flex flex-col rounded-xl border border-torii/20 bg-sand/97 backdrop-blur-md shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-moss/10 shrink-0">
              <span className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-widest text-torii select-none">
                <CalendarDays size={12} />
                Festival Occurrences
              </span>
              <button
                type="button"
                aria-label="Close"
                onClick={onClose}
                className="rounded-full p-0.5 text-stone/40 hover:text-stone transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1.5 px-5 pt-3 shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab("form")}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-mono font-bold uppercase tracking-widest transition-colors ${
                  activeTab === "form"
                    ? "bg-moss text-white"
                    : "border border-stone/20 text-stone/60 hover:border-stone/40"
                }`}
              >
                <ListPlus size={11} />
                Add dates
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("json")}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-mono font-bold uppercase tracking-widest transition-colors ${
                  activeTab === "json"
                    ? "bg-moss text-white"
                    : "border border-stone/20 text-stone/60 hover:border-stone/40"
                }`}
              >
                <FileJson size={11} />
                Import JSON
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {activeTab === "form" ? (
                <div className="space-y-4">
                  <p className="text-[11px] font-sans text-stone/60 leading-relaxed">
                    Sets the exact date(s) of existing festivals for one year. Saving overwrites
                    any occurrence already stored for the same shrine, festival, and year.
                  </p>

                  <div className="flex items-center gap-2">
                    <label className="text-[9px] font-mono font-bold uppercase tracking-wider text-moss/50 select-none">
                      Year
                    </label>
                    <input
                      type="number"
                      min={2020}
                      max={2100}
                      value={year}
                      onChange={(e) => setYearAndPrefill(Number(e.target.value))}
                      className={`${inputBase} w-24`}
                    />
                  </div>

                  <div className="space-y-3">
                    {rows.map((r, idx) => {
                      const shrine = shrineOptions.find((s) => s.shrine_slug === r.shrineSlug);
                      const festivalOptions = (shrine?.festivals ?? []).map((f) => ({
                        value: f.festival_id,
                        label: f.name_ja ? `${f.name_en} (${f.name_ja})` : f.name_en,
                      }));

                      return (
                        <div
                          key={r.key}
                          className="rounded-lg border border-moss/15 bg-washi/60 p-3 space-y-2 relative"
                        >
                          {rows.length > 1 && (
                            <button
                              type="button"
                              aria-label="Remove row"
                              onClick={() => removeRow(idx)}
                              className="absolute top-2 right-2 rounded-full p-1 text-stone/35 hover:text-red-600 transition-colors"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pr-6">
                            <div className="space-y-1">
                              <label className="text-[9px] font-mono font-bold uppercase tracking-wider text-moss/50 select-none">
                                Shrine
                              </label>
                              <SearchSelect
                                value={r.shrineSlug}
                                onChange={(v) => setRowShrine(idx, v)}
                                options={shrineOptions.map((s) => ({
                                  value: s.shrine_slug,
                                  label: s.shrine_name_en,
                                }))}
                                placeholder="Search shrines…"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-mono font-bold uppercase tracking-wider text-moss/50 select-none">
                                Festival
                              </label>
                              <SearchSelect
                                value={r.festivalId}
                                onChange={(v) => setRowFestival(idx, v)}
                                options={festivalOptions}
                                placeholder={r.shrineSlug ? "Search festivals…" : "Select a shrine first"}
                                disabled={!r.shrineSlug}
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pr-6">
                            <div className="space-y-1">
                              <label className="text-[9px] font-mono font-bold uppercase tracking-wider text-moss/50 select-none">
                                Start date
                              </label>
                              <input
                                type="date"
                                value={r.startDate}
                                onChange={(e) => setRowField(idx, "startDate", e.target.value)}
                                className={inputBase}
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-mono font-bold uppercase tracking-wider text-moss/50 select-none">
                                End date (optional)
                              </label>
                              <input
                                type="date"
                                value={r.endDate}
                                onChange={(e) => setRowField(idx, "endDate", e.target.value)}
                                className={inputBase}
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-mono font-bold uppercase tracking-wider text-moss/50 select-none">
                                Notes (optional)
                              </label>
                              <input
                                type="text"
                                value={r.notes}
                                onChange={(e) => setRowField(idx, "notes", e.target.value)}
                                className={inputBase}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={addRow}
                    className="flex items-center gap-1.5 rounded-full border border-moss/30 px-3 py-1 text-[10px] font-mono font-bold uppercase tracking-widest text-moss hover:border-moss hover:bg-moss/10 transition-colors"
                  >
                    <Plus size={11} />
                    Add festival
                  </button>

                  {formError && (
                    <p className="text-[10px] font-mono text-red-500/80 select-none">{formError}</p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-[11px] font-sans text-stone/60 leading-relaxed">
                    Paste or upload an array of{" "}
                    <code className="text-[10px] font-mono">
                      {"{ shrine_slug, festival_name_en, occurrences: [...] }"}
                    </code>{" "}
                    targets. Matching (shrine, festival, year) occurrences are overwritten.
                  </p>

                  <label className="flex items-center gap-1.5 w-fit rounded-full border border-stone/20 px-3 py-1 text-[10px] font-mono font-bold uppercase tracking-widest text-stone/60 hover:border-stone/40 hover:text-stone cursor-pointer transition-colors">
                    <Upload size={11} />
                    Upload .json
                    <input type="file" accept=".json" onChange={handleFile} className="hidden" />
                  </label>

                  <textarea
                    value={jsonText}
                    onChange={(e) => setJsonText(e.target.value)}
                    spellCheck={false}
                    rows={14}
                    className={`${inputBase} font-mono resize-y`}
                  />

                  {jsonParsed.error && (
                    <p className="text-[10px] font-mono text-red-500/80 select-none">{jsonParsed.error}</p>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-moss/10 shrink-0">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="rounded-full border border-stone/20 px-3 py-1 text-[10px] font-mono font-bold uppercase tracking-widest text-stone/60 hover:border-stone/40 hover:text-stone transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              {activeTab === "form" ? (
                <button
                  type="button"
                  onClick={handleFormSave}
                  disabled={saving}
                  className="rounded-full bg-moss px-4 py-1 text-[10px] font-mono font-bold uppercase tracking-widest text-white hover:bg-moss/90 transition-colors disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save occurrences"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleJsonSave}
                  disabled={saving || !!jsonParsed.error || !jsonText.trim()}
                  className="rounded-full bg-moss px-4 py-1 text-[10px] font-mono font-bold uppercase tracking-widest text-white hover:bg-moss/90 transition-colors disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Import"}
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
