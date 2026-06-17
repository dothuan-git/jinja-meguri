import { notFound } from "next/navigation";
import { loadStore } from "@/lib/db/store";
import { getShrineDetail } from "@/lib/db/repo";
import ShrineDetailView from "@/components/ShrineDetailView";

export const dynamic = "force-dynamic";

export default async function ShrinePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const detail = getShrineDetail(await loadStore(), slug);
  if (!detail) notFound();
  return <ShrineDetailView shrine={detail} variant="page" />;
}
