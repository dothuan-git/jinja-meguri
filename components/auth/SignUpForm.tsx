"use client";

import { useState } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth/client";
import SocialAuthButtons from "./SocialAuthButtons";

const INPUT =
  "w-full rounded-xl border border-moss/20 bg-washi/60 px-4 py-2.5 text-sm text-stone outline-none transition-colors placeholder:text-moss-light/60 focus:border-torii";
const LABEL = "block text-[11px] font-bold uppercase tracking-widest text-moss-light";

export default function SignUpForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const { error } = await authClient.signUp.email({
        email,
        password,
        name,
        callbackURL: "/shrines", // where the email-verification link lands after confirming
      });
      if (error) {
        setError(error.message ?? "Could not create your account.");
        return;
      }
      // Email verification is required: don't sign in / redirect — confirm and
      // send the user to verify their inbox before they can sign in.
      setDone(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <div className="space-y-5 text-center">
        <p className="text-sm text-moss-light">
          We sent a verification link to <span className="font-bold text-stone">{email}</span>.
          Open it to activate your account, then sign in.
        </p>
        <Link
          href="/sign-in"
          className="inline-block rounded-xl bg-torii px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-washi transition-opacity hover:opacity-90"
        >
          Go to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <SocialAuthButtons />
      <form onSubmit={onSubmit} className="space-y-5">
      {error && (
        <p className="rounded-xl border border-torii/30 bg-torii/5 px-4 py-2.5 text-sm text-torii">
          {error}
        </p>
      )}
      <div className="space-y-1.5">
        <label htmlFor="name" className={LABEL}>Name</label>
        <input
          id="name"
          type="text"
          autoComplete="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={INPUT}
          placeholder="Your name"
        />
      </div>
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
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={INPUT}
          placeholder="At least 8 characters"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-torii px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-washi transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Creating account…" : "Sign up"}
      </button>
      <p className="text-center text-xs tracking-widest uppercase text-moss-light">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-bold text-torii hover:underline">
          Sign in
        </Link>
      </p>
      </form>
    </div>
  );
}
