"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveOccurrencesAction } from "@/app/admin/actions";
import OccurrenceJsonImport from "@/components/admin/OccurrenceJsonImport";
import OccurrenceForm, { type ShrineFestivalOption } from "@/components/admin/OccurrenceForm";
import { useToast } from "@/components/ui/Toast";

interface Props {
  options: ShrineFestivalOption[];
}

export default function OccurrenceEditor({ options }: Props) {
  const [tab, setTab] = useState<"form" | "json">("form");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function handleSave(data: unknown) {
    const formData = new FormData();
    formData.set("json", JSON.stringify(data));
    setError(null);
    startTransition(async () => {
      const result = await saveOccurrencesAction(null, formData);
      if (result?.success) {
        toast.success(`Saved ${result.count} festival date${result.count === 1 ? "" : "s"}.`);
        router.push("/admin/dashboard");
      } else if (result?.error) {
        setError(result.error);
        toast.error("Couldn't save festival dates. Please fix the errors shown.");
      }
    });
  }

  return (
    <div className="space-y-4">
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
        <OccurrenceForm options={options} onSave={handleSave} pending={isPending} />
      ) : (
        <OccurrenceJsonImport onSave={handleSave} pending={isPending} />
      )}
    </div>
  );
}
