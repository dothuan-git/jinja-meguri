import Link from "next/link";
import { loadStore } from "@/lib/db/store";
import { getShrineCards } from "@/lib/db/repo";
import AdminShrineRow from "@/components/admin/AdminShrineRow";
import LogoutButton from "@/components/admin/LogoutButton";
import { requireAdmin } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  await requireAdmin();
  const store = await loadStore();
  const shrines = getShrineCards(store);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Shrine Admin</h1>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/shrines/new"
            className="rounded bg-stone-800 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
          >
            + New shrine
          </Link>
          <LogoutButton />
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
        {shrines.length === 0 ? (
          <p className="px-6 py-8 text-center text-gray-500">No shrines yet — add the first one.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Prefecture</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {shrines.map((s) => (
                <AdminShrineRow key={s.slug} shrine={s} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
