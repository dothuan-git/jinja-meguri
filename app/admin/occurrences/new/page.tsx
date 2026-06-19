import Link from "next/link";
import { loadStore } from "@/lib/db/store";
import OccurrenceEditor from "@/components/admin/OccurrenceEditor";
import type { ShrineFestivalOption } from "@/components/admin/OccurrenceForm";
import { requireAdmin } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export default async function NewOccurrencesPage() {
  await requireAdmin();
  const store = await loadStore();

  const options: ShrineFestivalOption[] = store.shrines
    .map((s) => ({
      shrine_slug: s.slug,
      shrine_name_en: s.name_en,
      festivals: store.festivals
        .filter((f) => f.shrine_id === s.id)
        .map((f) => ({ name_en: f.name_en, name_ja: f.name_ja })),
    }))
    .filter((o) => o.festivals.length > 0)
    .sort((a, b) => a.shrine_name_en.localeCompare(b.shrine_name_en));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/dashboard" className="text-sm text-gray-500 hover:text-gray-800">← Back</Link>
        <h1 className="text-xl font-bold text-gray-900">Festival dates</h1>
      </div>
      <p className="max-w-2xl text-sm text-gray-500">
        Upload concrete per-year festival dates. The calendar shows the current year&apos;s occurrence when present,
        otherwise falls back to the festival&apos;s default date.
      </p>
      <OccurrenceEditor options={options} />
    </div>
  );
}
