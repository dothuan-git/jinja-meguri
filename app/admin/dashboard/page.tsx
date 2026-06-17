import Link from "next/link";
import { loadStore } from "@/lib/db/store";
import { getShrineCards } from "@/lib/db/repo";
import AdminShrineRow from "@/components/admin/AdminShrineRow";
import AdminDeityRow from "@/components/admin/AdminDeityRow";
import LogoutButton from "@/components/admin/LogoutButton";
import { requireAdmin } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  await requireAdmin();
  const store = await loadStore();
  const shrines = getShrineCards(store);

  const shrineCountByDeity = new Map<string, number>();
  for (const sd of store.shrine_deities) {
    shrineCountByDeity.set(sd.deity_id, (shrineCountByDeity.get(sd.deity_id) ?? 0) + 1);
  }
  const deities = [...store.deities].sort((a, b) => a.name_en.localeCompare(b.name_en));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Shrine Admin</h1>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/deities/new"
            className="rounded border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
          >
            + New deity
          </Link>
          <Link
            href="/admin/shrines/new"
            className="rounded bg-stone-800 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
          >
            + New shrine
          </Link>
          <LogoutButton />
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400">Shrines</h2>
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
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400">Deities</h2>
        <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
          {deities.length === 0 ? (
            <p className="px-6 py-8 text-center text-gray-500">No deities yet — add the first one.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Shrines</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {deities.map((d) => (
                  <AdminDeityRow key={d.id} deity={d} shrineCount={shrineCountByDeity.get(d.id) ?? 0} />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
