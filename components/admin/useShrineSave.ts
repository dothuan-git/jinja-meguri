"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { saveShrineAction } from "@/app/admin/actions";
import type { ShrineInput } from "@/lib/admin/shrineContract";
import { useToast } from "@/components/ui/Toast";

/**
 * Shared save flow for the shrine write pipeline, used by the in-place
 * detail-page editor and the `/shrines/new` create page. Builds
 * the `FormData{ json }` envelope, runs `saveShrineAction` in a transition,
 * and raises a toast for both success and validation errors. Must be called
 * inside a `ToastProvider`.
 */
export function useShrineSave(opts: {
  mode: "create" | "update";
  onSaved?: (slug: string) => void;
}) {
  const { mode, onSaved } = opts;
  const [saving, startTransition] = useTransition();
  const toast = useToast();
  const t = useTranslations("Toasts");

  function save(data: ShrineInput) {
    const formData = new FormData();
    formData.set("json", JSON.stringify(data));
    startTransition(async () => {
      const result = await saveShrineAction(null, formData);
      if (result?.success && result.slug) {
        toast.success(
          mode === "update"
            ? t("shrineUpdated", { name: data.name_en })
            : t("shrineAdded", { name: data.name_en }),
        );
        onSaved?.(result.slug);
      } else if (result?.error) {
        toast.error(t("shrineSaveFailed", { name: data.name_en, error: result.error }));
      }
    });
  }

  return { save, saving };
}
