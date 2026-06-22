/**
 * Shared route-transition loader. Rendered by each data route's `loading.tsx`
 * so Next streams an instant placeholder while the server component awaits the
 * DB (the pages are `force-dynamic`, so without this the viewport stays blank
 * until the request resolves).
 *
 * On-brand take on a spinner: a slowly rotating ensō (円相) arc circling the
 * 巡 ("pilgrimage") kanji from the 神社巡り wordmark, with the route label in
 * the nav's mono/tracked style. Motion is dropped under `prefers-reduced-motion`.
 */
export default function RouteLoading({ label = "Loading…" }: { label?: string }) {
  return (
    <div
      className="flex min-h-[60vh] flex-col items-center justify-center gap-7 px-4"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="relative flex h-20 w-20 items-center justify-center">
        <svg
          className="absolute inset-0 h-full w-full animate-spin [animation-duration:2.6s] motion-reduce:animate-none"
          viewBox="0 0 100 100"
          fill="none"
          aria-hidden="true"
        >
          {/* faint full ring */}
          <circle cx="50" cy="50" r="44" className="stroke-moss/15" strokeWidth="2" />
          {/* torii-red ensō arc sweeping ~3/4 of the circle */}
          <path
            d="M50 6 a44 44 0 1 1 -31 13"
            className="stroke-torii"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
        <span
          className="font-serif text-2xl text-moss"
          style={{ fontFamily: "'Noto Serif JP', serif" }}
          aria-hidden="true"
        >
          巡
        </span>
      </div>
      <span className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-moss-light">
        {label}
      </span>
    </div>
  );
}
