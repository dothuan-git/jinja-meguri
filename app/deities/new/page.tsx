import { requireAdmin } from "@/lib/auth/server";
import DeityCreateView from "@/components/DeityCreateView";

export const dynamic = "force-dynamic";

export default async function NewDeityPage() {
  await requireAdmin();
  return <DeityCreateView />;
}
