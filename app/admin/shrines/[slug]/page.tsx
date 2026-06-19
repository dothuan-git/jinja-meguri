import Link from "next/link";
import { notFound } from "next/navigation";
import { loadStore } from "@/lib/db/store";
import { getShrineDetail } from "@/lib/db/repo";
import ShrineEditor from "@/components/admin/ShrineEditor";
import { shrineDetailToInput } from "@/lib/admin/shrineInput";
import { requireAdmin } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export default async function EditShrinePage({ params }: { params: Promise<{ slug: string }> }) {
  await requireAdmin();
  const { slug } = await params;
  const store = await loadStore();
  const detail = getShrineDetail(store, slug);
  if (!detail) notFound();

  const catalogs = {
    regions: store.regions,
    prefectures: store.prefectures,
    ranks: store.ranks,
    prayerCategories: store.prayer_categories,
  };

  // Reconstruct the ShrineInput shape from ShrineDetail so the form is pre-filled
  const initialData = shrineDetailToInput(detail);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/dashboard" className="text-sm text-gray-500 hover:text-gray-800">← Back</Link>
        <h1 className="text-xl font-bold text-gray-900">
          Edit: {detail.name_en}
        </h1>
      </div>
      <ShrineEditor initialData={initialData} catalogs={catalogs} existingDeities={store.deities} />
    </div>
  );
}
