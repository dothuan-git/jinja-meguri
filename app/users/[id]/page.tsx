import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/server";
import SignOutButton from "@/components/auth/SignOutButton";

export const dynamic = "force-dynamic";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  // Owner-only: never reveal another account's profile (or its existence).
  if (!user || user.id !== id) notFound();

  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-14">
      <div className="rounded-2xl border border-moss/15 bg-washi/75 px-7 py-9 shadow-sm backdrop-blur-md">
        <div className="flex items-center justify-between gap-4">
          <h1 className="font-display text-2xl font-bold text-stone">{user.name || "Profile"}</h1>
          <span
            className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${
              user.isAdmin
                ? "border border-torii/40 text-torii"
                : "border border-moss/30 text-moss"
            }`}
          >
            {user.isAdmin ? "Admin" : "User"}
          </span>
        </div>
        <dl className="mt-6 space-y-3 text-sm">
          <div className="flex gap-3">
            <dt className="w-24 shrink-0 text-[11px] font-bold uppercase tracking-widest text-moss-light">
              Email
            </dt>
            <dd className="text-stone">{user.email}</dd>
          </div>
        </dl>
        <div className="mt-8 border-t border-moss/10 pt-6">
          <SignOutButton />
        </div>
      </div>
    </div>
  );
}
