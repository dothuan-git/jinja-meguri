"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { saveDeityAction } from "@/app/admin/actions";
import type { DeityInput } from "@/lib/admin/deityContract";
import { useToast } from "@/components/ui/Toast";

/**
 * Shared save flow for the deity write pipeline, used by the in-place carousel
 * editor and the `/deities/new` create page. Builds the `FormData{ json, id? }`
 * envelope, runs `saveDeityAction` in a transition, and raises a toast for both
 * success and validation errors. Must be called inside a `ToastProvider`.
 */
export function useDeitySave(opts: {
  mode: "create" | "update";
  deityId?: string;
  onSaved?: (nameJa: string) => void;
}) {
  const { mode, deityId, onSaved } = opts;
  const [saving, startTransition] = useTransition();
  const toast = useToast();
  const t = useTranslations("Toasts");

  function save(data: DeityInput) {
    const formData = new FormData();
    formData.set("json", JSON.stringify(data));
    if (deityId) formData.set("id", deityId);
    startTransition(async () => {
      const result = await saveDeityAction(null, formData);
      if (result?.success && result.name_ja) {
        toast.success(
          mode === "update"
            ? t("deityUpdated", { name: data.name_en })
            : t("deityAdded", { name: data.name_en }),
        );
        onSaved?.(result.name_ja);
      } else if (result?.error) {
        toast.error(t("deitySaveFailed", { name: data.name_en, error: result.error }));
      }
    });
  }

  return { save, saving };
}
