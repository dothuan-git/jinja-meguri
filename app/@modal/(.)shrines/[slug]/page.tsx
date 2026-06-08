import { notFound } from "next/navigation";
import { loadStore } from "@/lib/db/store";
import { getAllSlugs, getShrineDetail } from "@/lib/db/repo";
import ShrineDetailView from "@/components/ShrineDetailView";
import Modal from "@/components/Modal";

export async function generateStaticParams() {
  return getAllSlugs(await loadStore()).map((slug) => ({ slug }));
}

export default async function ShrineModal({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const detail = getShrineDetail(await loadStore(), slug);
  if (!detail) notFound();
  return (
    <Modal>
      <ShrineDetailView shrine={detail} variant="modal" />
    </Modal>
  );
}
