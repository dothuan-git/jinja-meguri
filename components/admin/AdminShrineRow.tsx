"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { deleteShrineAction } from "@/app/admin/actions";
import type { ShrineCard } from "@/lib/types";

export default function AdminShrineRow({ shrine }: { shrine: ShrineCard }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm(`Delete "${shrine.name_en}"? This cannot be undone.`)) return;
    startTransition(async () => {
      const result = await deleteShrineAction(shrine.slug);
      if (result.error) {
        alert(`Error: ${result.error}`);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <tr className={pending ? "opacity-50" : ""}>
      <td className="px-4 py-3 font-medium text-gray-900">
        {shrine.name_en}
        {shrine.name_ja && <span className="ml-2 text-xs text-gray-400">{shrine.name_ja}</span>}
      </td>
      <td className="px-4 py-3 text-gray-500">{shrine.prefecture}</td>
      <td className="px-4 py-3 font-mono text-xs text-gray-400">{shrine.slug}</td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-3">
          <Link
            href={`/admin/shrines/${shrine.slug}`}
            className="text-stone-600 hover:text-stone-900"
          >
            Edit
          </Link>
          <button
            onClick={handleDelete}
            disabled={pending}
            className="text-red-500 hover:text-red-700 disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
}
