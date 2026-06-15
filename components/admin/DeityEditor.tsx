"use client";

import { useState, useActionState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveDeityAction } from "@/app/admin/actions";
import type { DeityInput } from "@/lib/admin/deityContract";
import DeityJsonImport from "@/components/admin/DeityJsonImport";
import DeityForm from "@/components/admin/DeityForm";

interface Props {
  initialData?: DeityInput;
  deityId?: string;
}

export default function DeityEditor({ initialData, deityId }: Props) {
  const [tab, setTab] = useState<"form" | "json">("form");
  const [state, , pending] = useActionState(saveDeityAction, null);
  const router = useRouter();
  const [, startTransition] = useTransition();

  function handleSave(data: DeityInput) {
    const formData = new FormData();
    formData.set("json", JSON.stringify(data));
    if (deityId) formData.set("id", deityId);
    startTransition(async () => {
      const result = await saveDeityAction(null, formData);
      if (result?.success) {
        router.push("/admin/dashboard");
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* Tab switcher */}
      <div className="flex gap-2 border-b">
        {(["form", "json"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${
              tab === t
                ? "border-stone-800 text-stone-800"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            {t === "form" ? "Structured Form" : "JSON Import"}
          </button>
        ))}
      </div>

      {state?.error && (
        <div className="rounded bg-red-50 px-4 py-3 text-sm text-red-700">
          <strong>Error:</strong> {state.error}
        </div>
      )}
      {state?.success && (
        <div className="rounded bg-green-50 px-4 py-3 text-sm text-green-700">
          Deity saved successfully.
        </div>
      )}

      {tab === "form" ? (
        <DeityForm initialData={initialData} onSave={handleSave} pending={pending} />
      ) : (
        <DeityJsonImport initialData={initialData} onSave={handleSave} pending={pending} />
      )}
    </div>
  );
}
