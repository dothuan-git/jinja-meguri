import { notFound } from "next/navigation";
import { loadStore } from "@/lib/db/store";
import { getAllSlugs, getShrineDetail } from "@/lib/db/repo";
import ShrineDetailView from "@/components/ShrineDetailView";

export function generateStaticParams() {
  return getAllSlugs(loadStore()).map((slug) => ({ slug }));
}

export default async function ShrinePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const detail = getShrineDetail(loadStore(), slug);
  if (!detail) notFound();
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <ShrineDetailView shrine={detail} variant="page" />
    </main>
  );
}
