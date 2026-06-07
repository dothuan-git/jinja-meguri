"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SearchBox({ autoFocus = false }: { autoFocus?: boolean }) {
  const [q, setQ] = useState("");
  const router = useRouter();

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        const v = q.trim();
        if (v) router.push(`/search?q=${encodeURIComponent(v)}`);
      }}
      className="group flex items-center gap-2 border-b border-[var(--hairline)] pb-1 focus-within:border-vermilion transition-colors"
    >
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        className="text-sumi-soft group-focus-within:text-vermilion"
        aria-hidden
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m21 21-4.3-4.3" />
      </svg>
      <input
        type="search"
        // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus={autoFocus}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search shrines, kami, festivals…"
        aria-label="Search shrines, deities, and festivals"
        className="w-52 bg-transparent text-sm placeholder:text-sumi-soft/70 focus:outline-none"
      />
    </form>
  );
}
