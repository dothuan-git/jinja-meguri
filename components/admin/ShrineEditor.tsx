"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveShrineAction } from "@/app/admin/actions";
import type { ShrineInput } from "@/lib/admin/shrineContract";
import type { Region, Prefecture, Rank, PrayerCategory, Deity } from "@/lib/types";
import ShrineJsonImport from "@/components/admin/ShrineJsonImport";
import ShrineForm from "@/components/admin/ShrineForm";
import { useToast } from "@/components/ui/Toast";

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
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function handleSave(data: ShrineInput) {
    const formData = new FormData();
    formData.set("json", JSON.stringify(data));
    setError(null);
    startTransition(async () => {
      const result = await saveShrineAction(null, formData);
      if (result?.success && result.slug) {
        toast.success(
          initialData
            ? `Shrine “${data.name_en}” updated.`
            : `Shrine “${data.name_en}” added.`,
        );
        router.push("/admin");
      } else if (result?.error) {
        setError(result.error);
        toast.error(`Couldn't save shrine “${data.name_en}”. Please fix the errors shown.`);
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

      {error && (
        <div className="rounded bg-red-50 px-4 py-3 text-sm text-red-700">
          <strong>Error:</strong> {error}
        </div>
      )}

      {tab === "form" ? (
        <ShrineForm
          initialData={initialData}
          catalogs={catalogs}
          existingDeities={existingDeities}
          onSave={handleSave}
          pending={isPending}
        />
      ) : (
        <ShrineJsonImport
          initialData={initialData}
          onSave={handleSave}
          pending={isPending}
        />
      )}
    </div>
  );
}
