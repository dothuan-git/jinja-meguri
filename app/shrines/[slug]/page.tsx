import { notFound } from "next/navigation";
import { loadStore } from "@/lib/db/store";
import { getShrineDetail } from "@/lib/db/repo";
import ShrineDetailView, { type ShrineDetailEditor } from "@/components/ShrineDetailView";
import { getAdminEmail } from "@/lib/auth/server";
import { shrineDetailToInput, buildEditCatalogs } from "@/lib/admin/shrineInput";

export const dynamic = "force-dynamic";

export default async function ShrinePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const store = await loadStore();
  const detail = getShrineDetail(store, slug);
  if (!detail) notFound();

  // Admins get the in-place edit draft seed; everyone else gets nothing extra.
  const isAdmin = Boolean(await getAdminEmail());
  const editor: ShrineDetailEditor | undefined = isAdmin
    ? { initialData: shrineDetailToInput(detail), catalogs: buildEditCatalogs(store) }
    : undefined;

  return <ShrineDetailView shrine={detail} variant="page" editor={editor} />;
}
