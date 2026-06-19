import { Suspense } from "react";
import { loadStore } from "@/lib/db/store";
import { getDeityList } from "@/lib/db/repo";
import { getAdminEmail } from "@/lib/auth/server";
import DeityListing from "@/components/DeityListing";

export const dynamic = "force-dynamic";

export default async function DeitiesPage() {
  const store = await loadStore();
  const isAdmin = Boolean(await getAdminEmail());
  // DeityListing reads useSearchParams (?deity / ?edit); Suspense satisfies the
  // client-hook boundary requirement.
  return (
    <Suspense>
      <DeityListing deities={getDeityList(store)} isAdmin={isAdmin} />
    </Suspense>
  );
}
