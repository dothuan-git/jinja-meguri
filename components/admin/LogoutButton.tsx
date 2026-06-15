"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await authClient.signOut();
    router.replace("/admin");
  }

  return (
    <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-gray-800">
      Log out
    </button>
  );
}
