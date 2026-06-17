import Link from "next/link";
import DeityEditor from "@/components/admin/DeityEditor";
import { requireAdmin } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export default async function NewDeityPage() {
  await requireAdmin();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/dashboard" className="text-sm text-gray-500 hover:text-gray-800">← Back</Link>
        <h1 className="text-xl font-bold text-gray-900">New Deity</h1>
      </div>
      <DeityEditor />
    </div>
  );
}
