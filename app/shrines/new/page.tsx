import { loadStore } from "@/lib/db/store";
import ShrineDetailView, { type ShrineDetailEditor } from "@/components/ShrineDetailView";
import { requireAdmin } from "@/lib/auth/server";
import { emptyShrineInput, buildEditCatalogs } from "@/lib/admin/shrineInput";
import type { ShrineDetail } from "@/lib/types";

export const dynamic = "force-dynamic";

// Empty detail stub: in create mode the deity/festival sections render from the draft,
// so only the (empty, editable) header scalars are read from this.
const EMPTY_DETAIL: ShrineDetail = {
  slug: "",
  name_en: "",
  name_ja: null,
  city: null,
  prefecture: "",
  region: "",
  primary_deity: null,
  categories: [],
  highest_rank: null,
  region_id: 0,
  prefecture_id: 0,
  rank_codes: [],
  category_codes: [],
  deity_ja: [],
  festival_months: [],
  festivals_brief: [],
  prayer_focus: null,
  best_time: null,
  primary_deity_titles: [],
  address: null,
  coordinates: null,
  image_urls: [],
  deities: [],
  ranks: [],
  details: null,
  highlights: [],
  festivals: [],
  sources: [],
};

export default async function NewShrinePage() {
  await requireAdmin();
  const store = await loadStore();

  const editor: ShrineDetailEditor = {
    mode: "create",
    initialData: emptyShrineInput(),
    catalogs: buildEditCatalogs(store),
  };

  return <ShrineDetailView shrine={EMPTY_DETAIL} variant="page" editor={editor} />;
}
