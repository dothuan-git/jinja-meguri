import Link from "next/link";
import { loadStore } from "@/lib/db/store";
import ShrineEditor from "@/components/admin/ShrineEditor";
import { requireAdmin } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export default async function NewShrinePage() {
  await requireAdmin();
  const store = await loadStore();
  const catalogs = {
    regions: store.regions,
    prefectures: store.prefectures,
    ranks: store.ranks,
    prayerCategories: store.prayer_categories,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/dashboard" className="text-sm text-gray-500 hover:text-gray-800">← Back</Link>
        <h1 className="text-xl font-bold text-gray-900">New Shrine</h1>
      </div>
      <ShrineEditor catalogs={catalogs} />
    </div>
  );
}
