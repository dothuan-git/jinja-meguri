/**
 * Shared route-transition skeleton. Rendered by each data route's `loading.tsx`
 * so Next streams an instant placeholder while the server component awaits the
 * DB (the pages are `force-dynamic`, so without this the viewport stays blank
 * until the request resolves).
 */
export default function RouteLoading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6" aria-busy="true" aria-live="polite">
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-56 rounded-md bg-moss/10" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-44 rounded-xl bg-moss/10" />
          ))}
        </div>
      </div>
      <span className="sr-only">{label}</span>
    </div>
  );
}
