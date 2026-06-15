"use client";

import { useState } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth/client";

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const email = form.get("email") as string;
    const { error: authError } = await authClient.requestPasswordReset({
      email,
      redirectTo: `${window.location.origin}/admin/reset-password`,
    });
    if (authError) {
      setError(authError.message ?? "Something went wrong. Please try again.");
      setPending(false);
    } else {
      setSent(true);
    }
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-sm space-y-4 rounded-lg border bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-gray-900">Set or reset password</h1>

        {sent ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-700">
              If that email has an account, a link to set your password has been sent. Check your inbox
              (and spam folder). The link expires in 15 minutes.
            </p>
            <Link href="/admin" className="block text-sm text-stone-600 hover:text-stone-800">
              ← Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            )}

            <p className="text-sm text-gray-600">
              New admin setting up for the first time, or resetting a forgotten password? Enter your
              email and we&apos;ll send a link.
            </p>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
              />
            </div>

            <button
              type="submit"
              disabled={pending}
              className="w-full rounded bg-stone-800 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-60"
            >
              {pending ? "Sending…" : "Send link"}
            </button>

            <Link href="/admin" className="block text-center text-sm text-stone-600 hover:text-stone-800">
              ← Back to sign in
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
