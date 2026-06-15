"use client";

import { useState, useActionState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveShrineAction } from "@/app/admin/actions";
import type { ShrineInput } from "@/lib/admin/shrineContract";
import type { Region, Prefecture, Rank, PrayerCategory, Deity } from "@/lib/types";
import ShrineJsonImport from "@/components/admin/ShrineJsonImport";
import ShrineForm from "@/components/admin/ShrineForm";

interface Props {
  initialData?: ShrineInput;
  catalogs: {
    regions: Region[];
    prefectures: Prefecture[];
    ranks: Rank[];
    prayerCategories: PrayerCategory[];
  };
  existingDeities: Deity[];
}

export default function ShrineEditor({ initialData, catalogs, existingDeities }: Props) {
  const [tab, setTab] = useState<"form" | "json">("form");
  const [state, formAction, pending] = useActionState(saveShrineAction, null);
  const router = useRouter();
  const [, startTransition] = useTransition();

  function handleSave(data: ShrineInput) {
    const formData = new FormData();
    formData.set("json", JSON.stringify(data));
    startTransition(async () => {
      const result = await saveShrineAction(null, formData);
      if (result?.success && result.slug) {
        router.push("/admin");
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
          Shrine saved successfully.
        </div>
      )}

      {tab === "form" ? (
        <ShrineForm
          initialData={initialData}
          catalogs={catalogs}
          existingDeities={existingDeities}
          onSave={handleSave}
          pending={pending}
        />
      ) : (
        <ShrineJsonImport
          initialData={initialData}
          onSave={handleSave}
          pending={pending}
          formAction={formAction}
        />
      )}
    </div>
  );
}
