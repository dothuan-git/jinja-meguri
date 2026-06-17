"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { deleteDeityAction } from "@/app/admin/actions";
import { useToast } from "@/components/ui/Toast";

interface Props {
  deity: { id: string; name_en: string; name_ja: string | null; deity_type: string };
  shrineCount: number;
}

export default function AdminDeityRow({ deity, shrineCount }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  function handleDelete() {
    if (shrineCount > 0) {
      toast.error(
        `Cannot delete "${deity.name_en}" — it is linked to ${shrineCount} shrine${shrineCount === 1 ? "" : "s"}. Unlink it first.`,
      );
      return;
    }
    if (!confirm(`Delete "${deity.name_en}"? This cannot be undone.`)) return;
    startTransition(async () => {
      const result = await deleteDeityAction(deity.id);
      if (result.error) {
        toast.error(`Couldn't delete deity “${deity.name_en}”: ${result.error}`);
      } else {
        toast.success(`Deity “${deity.name_en}” deleted.`);
        router.refresh();
      }
    });
  }

  return (
    <tr className={pending ? "opacity-50" : ""}>
      <td className="px-4 py-3 font-medium text-gray-900">
        {deity.name_en}
        {deity.name_ja && <span className="ml-2 text-xs text-gray-400">{deity.name_ja}</span>}
      </td>
      <td className="px-4 py-3 text-gray-500">{deity.deity_type}</td>
      <td className="px-4 py-3 text-gray-500">{shrineCount}</td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-3">
          <Link href={`/admin/deities/${deity.id}`} className="text-stone-600 hover:text-stone-900">
            Edit
          </Link>
          <button
            onClick={handleDelete}
            disabled={pending || shrineCount > 0}
            title={shrineCount > 0 ? "Linked to shrines — unlink first" : undefined}
            className="text-red-500 hover:text-red-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
}
