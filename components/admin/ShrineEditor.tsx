"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ShrineInput } from "@/lib/admin/shrineContract";
import type { Region, Prefecture, Rank, PrayerCategory, Deity } from "@/lib/types";
import ShrineJsonImport from "@/components/admin/ShrineJsonImport";
import ShrineForm from "@/components/admin/ShrineForm";
import { useShrineSave } from "@/components/admin/useShrineSave";

interface Props {
  initialData?: ShrineInput;
  catalogs: {
    regions: Region[];
    prefectures: Prefecture[];
    ranks: Rank[];
    prayerCategories: PrayerCategory[];
  };
  existingDeities: Deity[];
  /**
   * Override the post-save behavior. When provided, it is called with the saved
   * slug instead of redirecting to /admin — used by the inline-on-detail-page editor.
   */
  onSaved?: (slug: string) => void;
}

export default function ShrineEditor({ initialData, catalogs, existingDeities, onSaved }: Props) {
  const [tab, setTab] = useState<"form" | "json">("form");
  const router = useRouter();
  const { save, saving: isPending, error } = useShrineSave({
    mode: initialData ? "update" : "create",
    onSaved: (slug) => (onSaved ? onSaved(slug) : router.push("/admin")),
  });

  function handleSave(data: ShrineInput) {
    save(data);
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
