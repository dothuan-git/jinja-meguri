"use client";

import { useState } from "react";
import { DEITY_TYPES, type DeityInput } from "@/lib/admin/deityContract";

interface Props {
  initialData?: DeityInput;
  onSave: (data: DeityInput) => void;
  pending: boolean;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );
}

const cls = "w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500";
const textareaClass = `${cls} font-sans`;

export default function DeityForm({ initialData, onSave, pending }: Props) {
  const [nameEn, setNameEn] = useState(initialData?.name_en ?? "");
  const [nameJa, setNameJa] = useState(initialData?.name_ja ?? "");
  const [deityType, setDeityType] = useState<typeof DEITY_TYPES[number]>(initialData?.deity_type ?? "mythological");
  const [titles, setTitles] = useState<string[]>(initialData?.titles ?? []);
  const [canonicalLore, setCanonicalLore] = useState(initialData?.canonical_lore ?? "");

  function updateTitle(i: number, value: string) {
    setTitles((prev) => prev.map((t, idx) => (idx === i ? value : t)));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleanTitles = titles.map((t) => t.trim()).filter(Boolean);
    const data: DeityInput = {
      name_en: nameEn,
      name_ja: nameJa,
      deity_type: deityType,
      titles: cleanTitles.length ? cleanTitles : null,
      canonical_lore: canonicalLore || null,
    };
    onSave(data);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <section className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400">Identity</h2>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Name (romaji / English) *">
            <input value={nameEn} onChange={(e) => setNameEn(e.target.value)} required className={cls} placeholder="Inari Ōkami" />
          </Field>
          <Field label="Name (kanji) *">
            <input value={nameJa} onChange={(e) => setNameJa(e.target.value)} required className={cls} placeholder="稲荷大神" />
          </Field>
        </div>
        <Field label="Deity type *">
          <select value={deityType} onChange={(e) => setDeityType(e.target.value as typeof DEITY_TYPES[number])} className={cls}>
            {DEITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400">Titles</h2>
          <button type="button" onClick={() => setTitles((t) => [...t, ""])} className="text-sm text-stone-600 hover:text-stone-900">
            + Add title
          </button>
        </div>
        {titles.length === 0 && <p className="text-sm text-gray-400">No titles — divine epithets are optional.</p>}
        {titles.map((t, i) => (
          <div key={i} className="flex items-center gap-3">
            <input value={t} onChange={(e) => updateTitle(i, e.target.value)} className={cls} placeholder="e.g. God of rice and prosperity" />
            <button type="button" onClick={() => setTitles((prev) => prev.filter((_, j) => j !== i))} className="text-xs text-red-500 hover:text-red-700">✕</button>
          </div>
        ))}
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400">Lore</h2>
        <Field label="Canonical lore (Kojiki / Nihon Shoki narrative)">
          <textarea value={canonicalLore} onChange={(e) => setCanonicalLore(e.target.value)} rows={6} className={textareaClass} />
        </Field>
      </section>

      <div className="flex gap-3 pt-2 border-t">
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-stone-800 px-6 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save deity"}
        </button>
        <a href="/admin/dashboard" className="rounded border px-6 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
          Cancel
        </a>
      </div>
    </form>
  );
}
