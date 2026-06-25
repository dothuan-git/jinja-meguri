"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Trash2, X } from "lucide-react";
import { deleteShrineAction } from "@/app/admin/actions";

export default function DeleteShrinePopup({
  open,
  onClose,
  slug,
  shrineName,
}: {
  open: boolean;
  onClose: () => void;
  slug: string;
  shrineName: string;
}) {
  const router = useRouter();
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    setConfirmText("");
    setError(null);
  }, [open]);

  const canDelete = confirmText.trim() === slug && !isPending;

  function handleDelete() {
    if (!canDelete) return;
    startTransition(async () => {
      const res = await deleteShrineAction(slug);
      if (res.error) {
        setError(res.error);
      } else {
        onClose();
        router.push("/shrines");
        router.refresh();
      }
    });
  }

  const inputBase =
    "w-full rounded-sm border border-dashed border-torii/30 bg-torii/[0.04] px-2 py-1.5 text-xs font-mono text-stone/80 outline-none placeholder:text-stone/30 focus:border-torii transition-colors";

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -6 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="w-full max-w-sm rounded-xl border border-torii/20 bg-sand/97 backdrop-blur-md shadow-lg p-5 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-widest text-red-600 select-none">
                <Trash2 size={11} />
                Delete Shrine
              </span>
              <button
                type="button"
                aria-label="Close delete confirmation"
                onClick={onClose}
                className="rounded-full p-0.5 text-stone/40 hover:text-stone transition-colors"
              >
                <X size={13} />
              </button>
            </div>

            {/* Warning */}
            <p className="text-xs font-sans text-stone/70 leading-relaxed">
              Permanently delete{" "}
              <span className="font-bold text-stone">&ldquo;{shrineName}&rdquo;</span> and all
              its records. This cannot be undone.
            </p>

            {/* Slug confirmation input */}
            <div className="space-y-1">
              <label className="block text-[9px] font-mono font-bold uppercase tracking-wider text-moss/50 select-none">
                Type{" "}
                <span className="text-stone/60 normal-case tracking-normal font-mono font-bold">
                  {slug}
                </span>{" "}
                to confirm
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleDelete()}
                placeholder={slug}
                aria-label="Confirm shrine slug"
                className={inputBase}
                autoFocus
              />
            </div>

            {error && (
              <p className="text-[9px] font-mono text-red-500/80 select-none">{error}</p>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-1 border-t border-moss/10">
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="rounded-full border border-stone/20 px-3 py-1 text-[10px] font-mono font-bold uppercase tracking-widest text-stone/60 hover:border-stone/40 hover:text-stone transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={!canDelete}
                className="flex items-center gap-1 rounded-full bg-red-600 px-3 py-1 text-[10px] font-mono font-bold uppercase tracking-widest text-white hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 size={11} />
                {isPending ? "Deleting…" : "Delete"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
