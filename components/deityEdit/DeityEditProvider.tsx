"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Check, X } from "lucide-react";
import type { DeityInput } from "@/lib/admin/deityContract";
import { ToastProvider } from "@/components/ui/Toast";
import { useDeitySave } from "@/components/admin/useDeitySave";
import { DeityEditContext, type DeityEditApi } from "@/components/deityEdit/context";

interface Props {
  initialData: DeityInput;
  /** Present in update mode; routes the save to `updateDeity` by id. */
  deityId?: string;
  mode?: "create" | "update";
  onCancel: () => void;
  onSaved: (nameJa: string) => void;
  children: React.ReactNode;
}

export default function DeityEditProvider(props: Props) {
  // ToastProvider must wrap the subtree that calls useToast (via useDeitySave).
  return (
    <ToastProvider>
      <EditFrame {...props} />
    </ToastProvider>
  );
}

function EditFrame({ initialData, deityId, mode = "update", onCancel, onSaved, children }: Props) {
  const [draft, setDraft] = useState<DeityInput>(initialData);
  const { save, saving, error } = useDeitySave({ mode, deityId, onSaved });
  const creating = mode === "create";

  // Portal the floating bar to <body> so the carousel's Framer-Motion transform
  // (which establishes a containing block for `position: fixed`) can't capture it.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const api = useMemo<DeityEditApi>(
    () => ({
      editing: true,
      mode,
      draft,
      update: (patch) => setDraft((prev) => ({ ...prev, ...patch })),
    }),
    [draft, mode],
  );

  const bar = (
    <div className="fixed inset-x-0 bottom-0 z-[70] flex justify-center px-4 pb-5 pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-moss/15 bg-washi/75 backdrop-blur-md px-4 py-2.5 shadow-lg">
        <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-torii">
          {creating ? "New deity" : "Editing"}
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
          onClick={() => save(draft)}
          disabled={saving}
          className="flex items-center gap-1.5 rounded-full bg-moss px-4 py-1 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-moss/90 disabled:opacity-60"
        >
          <Check size={13} />
          <span>{saving ? "Saving…" : creating ? "Create" : "Save"}</span>
        </button>
      </div>
    </div>
  );

  return (
    <DeityEditContext.Provider value={api}>
      {children}
      {mounted && createPortal(bar, document.body)}
    </DeityEditContext.Provider>
  );
}
