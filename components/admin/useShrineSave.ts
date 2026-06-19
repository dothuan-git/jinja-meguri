"use client";

import { useState, useTransition } from "react";
import { saveShrineAction } from "@/app/admin/actions";
import type { ShrineInput } from "@/lib/admin/shrineContract";
import { useToast } from "@/components/ui/Toast";

/**
 * Shared save flow for the shrine write pipeline, used by both the structured
 * admin form ({@link ShrineEditor}) and the in-place detail-page editor. Builds
 * the `FormData{ json }` envelope, runs `saveShrineAction` in a transition,
 * raises a toast, and surfaces the server's validation error. Must be called
 * inside a `ToastProvider`.
 */
export function useShrineSave(opts: {
  mode: "create" | "update";
  onSaved?: (slug: string) => void;
}) {
  const { mode, onSaved } = opts;
  const [error, setError] = useState<string | null>(null);
  const [saving, startTransition] = useTransition();
  const toast = useToast();

  function save(data: ShrineInput) {
    const formData = new FormData();
    formData.set("json", JSON.stringify(data));
    setError(null);
    startTransition(async () => {
      const result = await saveShrineAction(null, formData);
      if (result?.success && result.slug) {
        toast.success(
          mode === "update"
            ? `Shrine “${data.name_en}” updated.`
            : `Shrine “${data.name_en}” added.`,
        );
        onSaved?.(result.slug);
      } else if (result?.error) {
        setError(result.error);
        toast.error(`Couldn't save shrine “${data.name_en}”. Please fix the errors shown.`);
      }
    });
  }

  return { save, saving, error };
}
