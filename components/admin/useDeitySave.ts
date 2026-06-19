"use client";

import { useState, useTransition } from "react";
import { saveDeityAction } from "@/app/admin/actions";
import type { DeityInput } from "@/lib/admin/deityContract";
import { useToast } from "@/components/ui/Toast";

/**
 * Shared save flow for the deity write pipeline, used by the in-place carousel
 * editor and the `/deities/new` create page. Builds the `FormData{ json, id? }`
 * envelope, runs `saveDeityAction` in a transition, raises a toast, and surfaces
 * the server's validation error. Must be called inside a `ToastProvider`.
 */
export function useDeitySave(opts: {
  mode: "create" | "update";
  deityId?: string;
  onSaved?: (nameJa: string) => void;
}) {
  const { mode, deityId, onSaved } = opts;
  const [error, setError] = useState<string | null>(null);
  const [saving, startTransition] = useTransition();
  const toast = useToast();

  function save(data: DeityInput) {
    const formData = new FormData();
    formData.set("json", JSON.stringify(data));
    if (deityId) formData.set("id", deityId);
    setError(null);
    startTransition(async () => {
      const result = await saveDeityAction(null, formData);
      if (result?.success && result.name_ja) {
        toast.success(
          mode === "update"
            ? `Deity “${data.name_en}” updated.`
            : `Deity “${data.name_en}” added.`,
        );
        onSaved?.(result.name_ja);
      } else if (result?.error) {
        setError(result.error);
        toast.error(`Couldn't save deity “${data.name_en}”. Please fix the errors shown.`);
      }
    });
  }

  return { save, saving, error };
}
