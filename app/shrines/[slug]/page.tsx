import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { loadStore } from "@/lib/db/store";
import { getShrineDetail } from "@/lib/db/repo";
import type { Locale } from "@/lib/i18n";
import ShrineDetailView, { type ShrineDetailEditor, type ShrineMarkInfo } from "@/components/ShrineDetailView";
import { getCurrentUser } from "@/lib/auth/server";
import { loadUserMarks } from "@/lib/db/userRepo";
import { buildShrineInput, buildEditCatalogs } from "@/lib/admin/shrineInput";

export const dynamic = "force-dynamic";

export default async function ShrinePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const store = await loadStore();
  const locale = (await getLocale()) as Locale;
  const detail = getShrineDetail(store, slug, locale);
  if (!detail) notFound();

  const user = await getCurrentUser();
  // Admins get the in-place edit draft seed built from RAW rows (both languages),
  // never from the localized `detail` — that would round-trip JA into EN columns.
  const editor: ShrineDetailEditor | undefined = user?.isAdmin
    ? { initialData: buildShrineInput(store, slug)!, catalogs: buildEditCatalogs(store) }
    : undefined;

  // Any signed-in account can favorite / collect a goshuin (non-cached per-user read).
  let mark: ShrineMarkInfo | undefined;
  if (user) {
    const row = (await loadUserMarks(user.id)).find((m) => m.slug === slug);
    mark = { saved: Boolean(row?.saved_at), stamped: Boolean(row?.stamped_at), stampedAt: row?.stamped_at ?? null };
  }

  return (
    <ShrineDetailView shrine={detail} variant="page" editor={editor} mark={mark} isSignedIn={Boolean(user)} />
  );
}
