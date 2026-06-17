import Link from "next/link";
import { notFound } from "next/navigation";
import { loadStore } from "@/lib/db/store";
import DeityEditor from "@/components/admin/DeityEditor";
import { DEITY_TYPES, type DeityInput } from "@/lib/admin/deityContract";
import { requireAdmin } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export default async function EditDeityPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const store = await loadStore();
  const deity = store.deities.find((d) => d.id === id);
  if (!deity) notFound();

  const deityType = (DEITY_TYPES as readonly string[]).includes(deity.deity_type)
    ? (deity.deity_type as typeof DEITY_TYPES[number])
    : "mythological";

  const initialData: DeityInput = {
    name_en: deity.name_en,
    name_ja: deity.name_ja ?? "",
    deity_type: deityType,
    titles: deity.titles ?? [],
    canonical_lore: deity.canonical_lore,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/dashboard" className="text-sm text-gray-500 hover:text-gray-800">← Back</Link>
        <h1 className="text-xl font-bold text-gray-900">Edit deity: {deity.name_en}</h1>
      </div>
      <DeityEditor initialData={initialData} deityId={deity.id} />
    </div>
  );
}
