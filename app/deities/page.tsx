import { loadStore } from "@/lib/db/store";
import { getDeityList } from "@/lib/db/repo";
import DeityListing from "@/components/DeityListing";

export const dynamic = "force-dynamic";

export default async function DeitiesPage() {
  const store = await loadStore();
  return <DeityListing deities={getDeityList(store)} />;
}
