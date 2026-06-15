"use client";

import { useState } from "react";
import type { ShrineInput } from "@/lib/admin/shrineContract";

interface Props {
  initialData?: ShrineInput;
  onSave: (data: ShrineInput) => void;
  pending: boolean;
  formAction: (payload: FormData) => void;
}

export default function ShrineJsonImport({ initialData, onSave, pending, formAction }: Props) {
  const [text, setText] = useState(initialData ? JSON.stringify(initialData, null, 2) : "");
  const [parseError, setParseError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setParseError(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      setParseError("Not valid JSON — check your input.");
      return;
    }
    onSave(parsed as ShrineInput);
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setText(ev.target?.result as string ?? "");
    reader.readAsText(file);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Upload JSON file
        </label>
        <input type="file" accept=".json,application/json" onChange={handleFile} className="text-sm" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          or paste JSON
        </label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={24}
          spellCheck={false}
          className="w-full rounded border border-gray-300 px-3 py-2 font-mono text-xs focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
          placeholder='{"slug": "my-shrine", "name_en": "My Shrine", ...}'
        />
      </div>

      {parseError && (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{parseError}</p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={pending || !text.trim()}
          className="rounded bg-stone-800 px-5 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Validate & Save"}
        </button>
        <a href="/admin" className="rounded border px-5 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
          Cancel
        </a>
      </div>
    </form>
  );
}
