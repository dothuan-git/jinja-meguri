"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { authClient } from "@/lib/auth/client";

export default function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onClick() {
    setPending(true);
    try {
      await authClient.signOut();
    } finally {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <button
      onClick={onClick}
      disabled={pending}
      className="inline-flex items-center gap-2 rounded-xl border border-moss/25 px-4 py-2 text-xs font-bold uppercase tracking-widest text-moss transition-colors hover:border-torii hover:text-torii disabled:opacity-50"
    >
      <LogOut size={13} />
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
