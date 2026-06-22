"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth/client";

/**
 * OAuth provider buttons (e.g. "Continue with Google"). OAuth uses a single flow
 * for both sign-up and sign-in, so this is shared by both forms. Each provider
 * must be enabled in the Neon Auth console (client id/secret + callback URL) for
 * the button to succeed; until then the SDK returns an error we surface inline.
 */
const PROVIDERS = [
  {
    id: "google" as const,
    label: "Continue with Google",
    icon: <GoogleIcon />,
  },
];

export default function SocialAuthButtons({
  callbackURL = "/shrines",
}: {
  callbackURL?: string;
}) {
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onClick(provider: (typeof PROVIDERS)[number]["id"]) {
    setPending(provider);
    setError(null);
    try {
      const { error } = await authClient.signIn.social({ provider, callbackURL });
      if (error) {
        setError(error.message ?? "Could not continue with that provider.");
        setPending(null);
      }
      // On success the browser is redirected to the provider — leave pending set.
    } catch {
      setError("Something went wrong. Please try again.");
      setPending(null);
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-xl border border-torii/30 bg-torii/5 px-4 py-2.5 text-sm text-torii">
          {error}
        </p>
      )}
      <div className="space-y-2.5">
        {PROVIDERS.map((p) => (
          <button
            key={p.id}
            type="button"
            disabled={pending !== null}
            onClick={() => onClick(p.id)}
            className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-moss/20 bg-washi/60 px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-stone transition-colors hover:border-torii disabled:opacity-50"
          >
            {p.icon}
            {pending === p.id ? "Redirecting…" : p.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-moss/15" />
        <span className="text-[11px] font-bold uppercase tracking-widest text-moss-light/70">
          or
        </span>
        <span className="h-px flex-1 bg-moss/15" />
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z"
      />
    </svg>
  );
}
