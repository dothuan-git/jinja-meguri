"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth/client";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <div className="space-y-4">
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          Invalid or missing reset token.
        </p>
        <Link href="/admin/forgot-password" className="block text-sm text-stone-600 hover:text-stone-800">
          Request a new reset link →
        </Link>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const newPassword = form.get("password") as string;
    const confirm = form.get("confirm") as string;
    if (newPassword !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setPending(true);
    const { error: authError } = await authClient.resetPassword({ newPassword, token: token! });
    if (authError) {
      setError(authError.message ?? "Reset failed. The link may have expired.");
      setPending(false);
    } else {
      setDone(true);
    }
  }

  if (done) {
    return (
      <div className="space-y-4">
        <p className="rounded bg-green-50 px-3 py-2 text-sm text-green-700">
          Your password has been set. You can now sign in.
        </p>
        <Link href="/admin" className="block text-sm text-stone-600 hover:text-stone-800">
          ← Go to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="space-y-2">
          <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          <Link href="/admin/forgot-password" className="block text-sm text-stone-600 hover:text-stone-800">
            Request a new reset link →
          </Link>
        </div>
      )}

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          New password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
        />
      </div>

      <div>
        <label htmlFor="confirm" className="block text-sm font-medium text-gray-700">
          Confirm password
        </label>
        <input
          id="confirm"
          name="confirm"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded bg-stone-800 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-60"
      >
        {pending ? "Setting password…" : "Set password"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-sm space-y-4 rounded-lg border bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-gray-900">Set new password</h1>
        <Suspense fallback={<p className="text-sm text-gray-500">Loading…</p>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
