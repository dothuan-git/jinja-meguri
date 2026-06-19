"use client";

import { useMemo, useState } from "react";
import { Check, X } from "lucide-react";
import type { EditCatalogs } from "@/lib/types";
import type { ShrineInput } from "@/lib/admin/shrineContract";
import { ToastProvider } from "@/components/ui/Toast";
import { useShrineSave } from "@/components/admin/useShrineSave";
import { ShrineEditContext, type ShrineEditApi } from "@/components/shrineEdit/context";

function getAtPath(root: unknown, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>((acc, key) => (acc == null ? undefined : (acc as Record<string, unknown>)[key]), root);
}

// Immutable nested set; clones each node along the path so React sees new refs.
function setAtPath<T>(root: T, path: string, value: unknown): T {
  const keys = path.split(".");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clone: any = Array.isArray(root) ? [...(root as unknown[])] : { ...(root as object) };
  let cursor = clone;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    const child = cursor[k];
    cursor[k] = Array.isArray(child) ? [...child] : { ...(child ?? {}) };
    cursor = cursor[k];
  }
  cursor[keys[keys.length - 1]] = value;
  return clone;
}

interface Props {
  initialData: ShrineInput;
  catalogs: EditCatalogs;
  onCancel: () => void;
  onSaved: (slug: string) => void;
  children: React.ReactNode;
}

export default function ShrineEditProvider(props: Props) {
  // ToastProvider must wrap the subtree that calls useToast (via useShrineSave).
  return (
    <ToastProvider>
      <EditFrame {...props} />
    </ToastProvider>
  );
}

function EditFrame({ initialData, catalogs, onCancel, onSaved, children }: Props) {
  const [draft, setDraft] = useState<ShrineInput>(initialData);
  const { save, saving, error } = useShrineSave({ mode: "update", onSaved });

  const api = useMemo<ShrineEditApi>(
    () => ({
      editing: true,
      getField: (path) => {
        const v = getAtPath(draft, path);
        return v == null ? "" : String(v);
      },
      // Empty input → null, matching the structured form's normalization.
      setField: (path, value) => {
        if (path === "slug") return;
        setDraft((prev) => setAtPath(prev, path, value === "" ? null : value));
      },
      getValue: (path) => getAtPath(draft, path),
      // Raw set — no coercion, so arrays and the prefecture/region strings pass through verbatim.
      setValue: (path, value) => {
        if (path === "slug") return;
        setDraft((prev) => setAtPath(prev, path, value));
      },
      findDeityIndex: (nameJa) => draft.deities.findIndex((d) => d.name_ja === nameJa),
      catalogs,
    }),
    [draft, catalogs],
  );

  return (
    <ShrineEditContext.Provider value={api}>
      {children}

      {/* Floating action bar */}
      <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-5 pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-moss/15 bg-washi/95 backdrop-blur-md px-4 py-2.5 shadow-lg">
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-torii">
            Editing
          </span>
          <span className="text-stone/25 font-mono select-none text-xs">|</span>
          {error && (
            <span className="max-w-xs truncate text-xs text-red-600" title={error}>
              {error}
            </span>
          )}
          <button
            onClick={onCancel}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-full border border-stone/20 px-3 py-1 text-xs font-bold uppercase tracking-widest text-stone/70 transition-colors hover:border-stone/40 hover:text-stone disabled:opacity-50"
          >
            <X size={13} />
            <span>Cancel</span>
          </button>
          <button
            onClick={() => save({ ...draft, slug: initialData.slug })}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-full bg-moss px-4 py-1 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-moss/90 disabled:opacity-60"
          >
            <Check size={13} />
            <span>{saving ? "Saving…" : "Save"}</span>
          </button>
        </div>
      </div>
    </ShrineEditContext.Provider>
  );
}
