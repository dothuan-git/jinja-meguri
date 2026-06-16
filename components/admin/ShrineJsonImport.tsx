"use client";

import { useMemo, useState } from "react";
import type { ShrineInput } from "@/lib/admin/shrineContract";
import { checkCompleteness } from "@/lib/admin/keyCompleteness";

interface Props {
  initialData?: ShrineInput;
  onSave: (data: ShrineInput) => void;
  pending: boolean;
}

export default function ShrineJsonImport({ initialData, onSave, pending }: Props) {
  const [text, setText] = useState(initialData ? JSON.stringify(initialData, null, 2) : "");
  const [parseError, setParseError] = useState<string | null>(null);

  const completeness = useMemo(() => {
    if (!text.trim()) return null;
    try {
      return { report: checkCompleteness(JSON.parse(text)), invalid: false as const };
    } catch {
      return { report: null, invalid: true as const };
    }
  }, [text]);

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

      {completeness?.invalid && (
        <p className="rounded bg-amber-50 px-3 py-2 text-sm text-amber-700">
          Not valid JSON yet — key check will run once it parses.
        </p>
      )}

      {completeness?.report && (
        <div
          className={`rounded border px-3 py-2 text-xs ${
            completeness.report.complete
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-amber-200 bg-amber-50 text-amber-800"
          }`}
        >
          <p className="font-medium">
            {completeness.report.complete
              ? `✓ All keys present — ${completeness.report.totalPresent}/${completeness.report.totalExpected} across ${completeness.report.groups.length} objects`
              : `${completeness.report.totalMissing} missing key${completeness.report.totalMissing === 1 ? "" : "s"} — ${completeness.report.totalPresent}/${completeness.report.totalExpected} present`}
          </p>
          {!completeness.report.complete && (
            <ul className="mt-2 space-y-1">
              {completeness.report.groups
                .filter((g) => g.missing.length > 0)
                .map((g) => (
                  <li key={g.label} className="font-mono">
                    <span className="text-amber-900">{g.label}</span>{" "}
                    <span className="text-amber-600">({g.present}/{g.expected})</span>{" "}
                    missing: {g.missing.join(", ")}
                  </li>
                ))}
            </ul>
          )}
        </div>
      )}

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
