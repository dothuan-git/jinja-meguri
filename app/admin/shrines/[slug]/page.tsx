import Link from "next/link";
import { notFound } from "next/navigation";
import { loadStore } from "@/lib/db/store";
import { getShrineDetail } from "@/lib/db/repo";
import ShrineEditor from "@/components/admin/ShrineEditor";
import type { ShrineInput } from "@/lib/admin/shrineContract";
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
  const initialData: ShrineInput = {
    slug: detail.slug,
    name_en: detail.name_en,
    name_ja: detail.name_ja,
    region: detail.region,
    prefecture: detail.prefecture,
    city: detail.city,
    address: detail.address,
    coordinates: detail.coordinates,
    image_urls: detail.image_urls ?? [],
    details: {
      history: detail.details?.history,
      description: detail.details?.description,
      prayer_focus: detail.details?.prayer_focus,
      best_time: detail.details?.best_time,
    },
    ranks: detail.ranks.map((r) => r.name_en),
    prayer_categories: detail.categories.map((c) => c.name_en),
    deities: detail.deities.map((d) => ({
      name_ja: d.name_ja ?? "",
      is_primary: d.is_primary,
      sort_order: d.sort_order,
      regional_lore: d.regional_lore,
    })),
    festivals: detail.festivals.map((f) => ({
      name_en: f.name_en,
      name_ja: f.name_ja,
      time_prose: f.time_prose,
      start_date: f.start_date,
      end_date: f.end_date,
      origin: f.origin,
      meaning: f.meaning,
      ritual: f.ritual,
      prayer: f.prayer,
      festival_type: f.festival_type as "spectacle" | "pilgrimage" | null,
      visitor_notes: f.visitor_notes,
      occurrences: [],
    })),
    sources: detail.sources.map((s) => ({ url: s.url, title: s.title })),
  };

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
