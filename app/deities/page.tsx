import { Suspense } from "react";
import { getLocale } from "next-intl/server";
import { loadStore } from "@/lib/db/store";
import { getDeityList } from "@/lib/db/repo";
import { getAdminEmail } from "@/lib/auth/server";
import { buildDeityEditSeeds } from "@/lib/admin/deityInput";
import type { Locale } from "@/lib/i18n";
import DeityListing from "@/components/DeityListing";

export const dynamic = "force-dynamic";

export default async function DeitiesPage() {
  const store = await loadStore();
  const locale = (await getLocale()) as Locale;
  const isAdmin = Boolean(await getAdminEmail());
  // Admin-only edit seeds built from RAW rows (both languages) so editing never
  // round-trips the displayed locale back into the English columns.
  const editSeeds = isAdmin ? buildDeityEditSeeds(store) : undefined;
  // DeityListing reads useSearchParams (?deity / ?edit); Suspense satisfies the
  // client-hook boundary requirement.
  return (
    <Suspense>
      <DeityListing deities={getDeityList(store, locale)} isAdmin={isAdmin} editSeeds={editSeeds} />
    </Suspense>
  );
}
