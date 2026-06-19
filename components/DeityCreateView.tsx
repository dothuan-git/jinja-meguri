"use client";

import { useRouter } from "next/navigation";
import DeityCardBody, { type DeityCardData } from "@/components/DeityCardBody";
import DeityEditProvider from "@/components/deityEdit/DeityEditProvider";
import { emptyDeityInput } from "@/lib/admin/deityInput";

const EMPTY_CARD: DeityCardData = {
  name: "",
  japaneseName: "",
  deityType: "mythological",
  titles: [],
  canonicalLore: "",
  shrines: [],
};

/**
 * Detail-style create page for a new deity (admin-only), mirroring
 * `/shrines/new`. Mounts {@link DeityCardBody} in a {@link DeityEditProvider}
 * create draft on a static (non-carousel) card.
 */
export default function DeityCreateView() {
  const router = useRouter();

  return (
    <div className="relative w-full max-w-7xl mx-auto px-4 md:px-8 mt-4 pb-24 flex flex-col items-center">
      <div className="mb-8 text-center select-none">
        <div className="inline-flex items-center gap-2 text-[9px] font-mono tracking-widest uppercase text-moss-light/85 font-black bg-washi px-3 py-1 rounded-full border border-moss/10 shadow-3xs">
          <span>New Kami Chronicle</span>
          <span className="w-1 h-1 rounded-full bg-torii/30" />
          <span>新しい神</span>
        </div>
      </div>

      <div className="w-full">
        <div className="w-full bg-washi rounded-2xl md:rounded-3xl border border-moss/10 shadow-3xs p-6 md:p-10 relative">
          <div className="absolute inset-2 border border-dashed border-moss/5 pointer-events-none rounded-xl md:rounded-2xl" />
          <DeityEditProvider
            initialData={emptyDeityInput()}
            mode="create"
            onCancel={() => router.push("/deities")}
            onSaved={(nameJa) => {
              router.push(`/deities?deity=${encodeURIComponent(nameJa)}`);
              router.refresh();
            }}
          >
            <DeityCardBody deity={EMPTY_CARD} />
          </DeityEditProvider>
        </div>
      </div>
    </div>
  );
}
