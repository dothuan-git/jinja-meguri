"use client";

import { useMemo, useState } from "react";
import type { OccurrenceImportTarget } from "@/lib/admin/occurrenceContract";

export interface ShrineFestivalOption {
  shrine_slug: string;
  shrine_name_en: string;
  festivals: { name_en: string; name_ja: string | null }[];
}

interface Props {
  options: ShrineFestivalOption[];
  onSave: (target: OccurrenceImportTarget) => void;
  pending: boolean;
}

interface Row {
  year: number;
  start_date: string;
  end_date: string;
  notes: string;
}

const newRow = (): Row => ({ year: new Date().getFullYear(), start_date: "", end_date: "", notes: "" });

export default function OccurrenceForm({ options, onSave, pending }: Props) {
  const [shrineSlug, setShrineSlug] = useState("");
  const [festivalName, setFestivalName] = useState("");
  const [rows, setRows] = useState<Row[]>([newRow()]);
  const [error, setError] = useState<string | null>(null);

  const festivals = useMemo(
    () => options.find((o) => o.shrine_slug === shrineSlug)?.festivals ?? [],
    [options, shrineSlug],
  );

  function updateRow(i: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!shrineSlug) return setError("Select a shrine.");
    if (!festivalName) return setError("Select a festival.");
    const filled = rows.filter((r) => r.start_date.trim());
    if (filled.length === 0) return setError("Add at least one occurrence with a start date.");

    onSave({
      shrine_slug: shrineSlug,
      festival_name_en: festivalName,
      occurrences: filled.map((r) => ({
        year: r.year,
        start_date: r.start_date,
        end_date: r.end_date.trim() ? r.end_date : null,
        notes: r.notes.trim() ? r.notes : null,
      })),
    });
  }

  if (options.length === 0) {
    return (
      <p className="rounded bg-amber-50 px-4 py-3 text-sm text-amber-700">
        No festivals exist yet. Add a shrine with at least one festival first.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Shrine</label>
          <select
            value={shrineSlug}
            onChange={(e) => {
              setShrineSlug(e.target.value);
              setFestivalName("");
            }}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
          >
            <option value="">— select —</option>
            {options.map((o) => (
              <option key={o.shrine_slug} value={o.shrine_slug}>
                {o.shrine_name_en}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Festival</label>
          <select
            value={festivalName}
            onChange={(e) => setFestivalName(e.target.value)}
            disabled={!shrineSlug}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500 disabled:bg-gray-100"
          >
            <option value="">— select —</option>
            {festivals.map((f) => (
              <option key={f.name_en} value={f.name_en}>
                {f.name_ja ? `${f.name_en} (${f.name_ja})` : f.name_en}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">Yearly dates</label>
          <button
            type="button"
            onClick={() => setRows((prev) => [...prev, newRow()])}
            className="rounded border border-stone-300 px-3 py-1 text-xs font-medium text-stone-700 hover:bg-stone-50"
          >
            + Add year
          </button>
        </div>

        {rows.map((r, i) => (
          <div key={i} className="grid grid-cols-1 gap-2 rounded border border-gray-200 p-3 sm:grid-cols-[5rem_1fr_1fr_1fr_auto]">
            <div>
              <span className="block text-[10px] uppercase tracking-wide text-gray-400">Year</span>
              <input
                type="number"
                value={r.year}
                min={2020}
                max={2100}
                onChange={(e) => updateRow(i, { year: Number(e.target.value) })}
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <span className="block text-[10px] uppercase tracking-wide text-gray-400">Start date</span>
              <input
                type="date"
                value={r.start_date}
                onChange={(e) => updateRow(i, { start_date: e.target.value })}
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <span className="block text-[10px] uppercase tracking-wide text-gray-400">End date (optional)</span>
              <input
                type="date"
                value={r.end_date}
                onChange={(e) => updateRow(i, { end_date: e.target.value })}
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <span className="block text-[10px] uppercase tracking-wide text-gray-400">Notes (optional)</span>
              <input
                type="text"
                value={r.notes}
                onChange={(e) => updateRow(i, { notes: e.target.value })}
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => setRows((prev) => (prev.length === 1 ? prev : prev.filter((_, j) => j !== i)))}
                disabled={rows.length === 1}
                className="rounded px-2 py-1.5 text-sm text-gray-400 hover:text-red-600 disabled:opacity-40"
                title="Remove"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>

      {error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-stone-800 px-5 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save dates"}
        </button>
        <a href="/admin/dashboard" className="rounded border px-5 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
          Cancel
        </a>
      </div>
    </form>
  );
}
