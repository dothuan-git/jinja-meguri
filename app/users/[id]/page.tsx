import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth/server";
import { loadStore } from "@/lib/db/store";
import { loadUserMarks, getUserCollections, getUserProfile } from "@/lib/db/userRepo";
import { getShrineCards } from "@/lib/db/repo";
import UserProfileClient from "@/components/user/UserProfileClient";

export const dynamic = "force-dynamic";

// Generate dynamic SEO metadata based on the current pilgrim's name
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const user = await getCurrentUser();
  return {
    title: user ? `${user.name || "Pilgrim"}'s Sanctuary Pass — Jinja Meguri` : "Sanctuary Pass — Jinja Meguri",
    description: "Manage your sacred Shinto pilgrimage, view collected goshuin calligraphy seals, and trace your journey milestones across Japan.",
  };
}

export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  
  // Owner-only: never reveal another account's profile (or its existence).
  if (!user || user.id !== id) notFound();

  const [store, marks, profile] = await Promise.all([
    loadStore(),
    loadUserMarks(user.id),
    getUserProfile(user.id),
  ]);
  const { stamped, saved } = getUserCollections(store, marks);
  const totalShrines = getShrineCards(store).length;
  // "Visit every region / prefecture" milestones target the full catalog — the classic
  // goal of all 8 regions and all 47 prefectures of Japan.
  const totalRegions = store.regions.length;
  const totalPrefectures = store.prefectures.length;

  return (
    <UserProfileClient
      user={user}
      stamped={stamped}
      saved={saved}
      totalShrines={totalShrines}
      totalRegions={totalRegions}
      totalPrefectures={totalPrefectures}
      crest={profile.crest}
    />
  );
}
