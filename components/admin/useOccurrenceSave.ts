"use client";

import { useTransition } from "react";
import { saveOccurrencesAction } from "@/app/admin/actions";
import { useToast } from "@/components/ui/Toast";

/**
 * Shared save flow for the festival-occurrence write pipeline, used by both tabs
 * of `OccurrenceModal`. Accepts the same envelope `saveOccurrencesAction` /
 * `OccurrenceImportSchema` expect (a single target or an array of targets), runs
 * the action in a transition, and raises a toast for both success and errors.
 * Must be called inside a `ToastProvider`.
 */
export function useOccurrenceSave(opts: { onSaved?: () => void }) {
  const { onSaved } = opts;
  const [saving, startTransition] = useTransition();
  const toast = useToast();

  function save(data: unknown) {
    const formData = new FormData();
    formData.set("json", JSON.stringify(data));
    startTransition(async () => {
      const result = await saveOccurrencesAction(null, formData);
      if (result?.success) {
        toast.success(`Saved ${result.count} occurrence${result.count === 1 ? "" : "s"}.`);
        onSaved?.();
      } else if (result?.error) {
        toast.error(`Couldn't save occurrences: ${result.error}`);
      }
    });
  }

  return { save, saving };
}
