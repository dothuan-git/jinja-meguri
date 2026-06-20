"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth/client";

const INPUT =
  "w-full rounded-xl border border-moss/20 bg-washi/60 px-4 py-2.5 text-sm text-stone outline-none transition-colors placeholder:text-moss-light/60 focus:border-torii";
const LABEL = "block text-[11px] font-bold uppercase tracking-widest text-moss-light";

export default function SignInForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const { error } = await authClient.signIn.email({ email, password });
      if (error) {
        setError(error.message ?? "Could not sign in. Check your credentials.");
        return;
      }
      const target = params.get("redirect") || "/shrines";
      router.push(target);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {error && (
        <p className="rounded-xl border border-torii/30 bg-torii/5 px-4 py-2.5 text-sm text-torii">
          {error}
        </p>
      )}
      <div className="space-y-1.5">
        <label htmlFor="email" className={LABEL}>Email</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={INPUT}
          placeholder="you@example.com"
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="password" className={LABEL}>Password</label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={INPUT}
          placeholder="••••••••"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-torii px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-washi transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
      <p className="text-center text-xs tracking-widest uppercase text-moss-light">
        New here?{" "}
        <Link href="/sign-up" className="font-bold text-torii hover:underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}
