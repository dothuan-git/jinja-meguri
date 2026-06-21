import { notFound } from "next/navigation";
import { loadStore } from "@/lib/db/store";
import { getShrineDetail } from "@/lib/db/repo";
import ShrineDetailView, { type ShrineMarkInfo } from "@/components/ShrineDetailView";
import Modal from "@/components/Modal";
import { getCurrentUser } from "@/lib/auth/server";
import { loadUserMarks } from "@/lib/db/userRepo";

export const dynamic = "force-dynamic";

export default async function ShrineModal({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const detail = getShrineDetail(await loadStore(), slug);
  if (!detail) notFound();

  const user = await getCurrentUser();
  let mark: ShrineMarkInfo | undefined;
  if (user) {
    const row = (await loadUserMarks(user.id)).find((m) => m.slug === slug);
    mark = { saved: Boolean(row?.saved_at), stamped: Boolean(row?.stamped_at), stampedAt: row?.stamped_at ?? null };
  }

  return (
    <Modal>
      <ShrineDetailView shrine={detail} variant="modal" mark={mark} isSignedIn={Boolean(user)} />
    </Modal>
  );
}
