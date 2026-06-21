import Link from "next/link";
import { notFound } from "next/navigation";
import { Heart, Stamp } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/server";
import { loadStore } from "@/lib/db/store";
import { loadUserMarks, getUserCollections } from "@/lib/db/userRepo";
import type { ShrineCard } from "@/lib/types";
import SignOutButton from "@/components/auth/SignOutButton";

export const dynamic = "force-dynamic";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function ShrineMiniCard({ card, note }: { card: ShrineCard; note?: string }) {
  return (
    <Link
      href={`/shrines/${card.slug}`}
      className="group flex flex-col rounded-xl border border-moss/15 bg-washi/80 px-4 py-3 shadow-3xs transition-all hover:border-torii/40 hover:shadow-sm"
    >
      <span className="font-display text-sm font-black text-stone group-hover:text-torii">{card.name_en}</span>
      {card.name_ja && (
        <span className="font-serif text-xs text-torii-dark/80 tracking-wider" style={{ fontFamily: "'Noto Serif JP', serif" }}>
          {card.name_ja}
        </span>
      )}
      <span className="mt-1 text-[11px] text-stone/55">
        {[card.city, card.prefecture].filter(Boolean).join(", ")}
      </span>
      {note && <span className="mt-1.5 text-[10px] font-mono uppercase tracking-widest text-moss-light">{note}</span>}
    </Link>
  );
}

export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  // Owner-only: never reveal another account's profile (or its existence).
  if (!user || user.id !== id) notFound();

  const [store, marks] = await Promise.all([loadStore(), loadUserMarks(user.id)]);
  const { stamped, saved } = getUserCollections(store, marks);

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-14">
      <div className="rounded-2xl border border-moss/15 bg-washi/75 px-7 py-9 shadow-sm backdrop-blur-md">
        <div className="flex items-center justify-between gap-4">
          <h1 className="font-display text-2xl font-bold text-stone">{user.name || "Profile"}</h1>
          <span
            className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${
              user.isAdmin ? "border border-torii/40 text-torii" : "border border-moss/30 text-moss"
            }`}
          >
            {user.isAdmin ? "Admin" : "User"}
          </span>
        </div>
        <dl className="mt-6 space-y-3 text-sm">
          <div className="flex gap-3">
            <dt className="w-24 shrink-0 text-[11px] font-bold uppercase tracking-widest text-moss-light">Email</dt>
            <dd className="text-stone">{user.email}</dd>
          </div>
        </dl>
        <div className="mt-8 border-t border-moss/10 pt-6">
          <SignOutButton />
        </div>
      </div>

      {/* 御朱印帳 — Goshuin Stamp Book */}
      <section className="mt-10">
        <div className="mb-4 flex items-center gap-2">
          <Stamp size={15} className="text-torii" />
          <h2 className="font-display text-lg font-black tracking-wide text-stone">御朱印帳 — Stamp Book</h2>
          <span className="rounded-full border border-moss/10 bg-bamboo-light/50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-moss">
            {stamped.length}
          </span>
        </div>
        {stamped.length === 0 ? (
          <p className="rounded-xl border border-dashed border-moss/20 px-5 py-8 text-center text-sm text-stone/55">
            No goshuin collected yet. Visit a{" "}
            <Link href="/shrines" className="font-bold text-torii hover:underline">
              shrine
            </Link>{" "}
            and affix its sacred seal.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {stamped.map((s) => (
              <ShrineMiniCard key={s.slug} card={s} note={`Collected ${formatDate(s.stamped_at)}`} />
            ))}
          </div>
        )}
      </section>

      {/* Saved — Want to visit */}
      <section className="mt-10">
        <div className="mb-4 flex items-center gap-2">
          <Heart size={15} className="text-torii" />
          <h2 className="font-display text-lg font-black tracking-wide text-stone">Saved — Want to Visit</h2>
          <span className="rounded-full border border-moss/10 bg-bamboo-light/50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-moss">
            {saved.length}
          </span>
        </div>
        {saved.length === 0 ? (
          <p className="rounded-xl border border-dashed border-moss/20 px-5 py-8 text-center text-sm text-stone/55">
            Nothing saved yet. Tap the heart on any{" "}
            <Link href="/shrines" className="font-bold text-torii hover:underline">
              shrine
            </Link>{" "}
            to add it here.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {saved.map((s) => (
              <ShrineMiniCard key={s.slug} card={s} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
