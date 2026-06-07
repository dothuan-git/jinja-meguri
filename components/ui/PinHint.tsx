export default function PinHint({ city, prefecture }: { city: string | null; prefecture: string }) {
  const place = [city, prefecture].filter(Boolean).join(" · ");
  return (
    <span data-testid="pin-hint" className="inline-flex items-center gap-1.5 text-sm text-sumi-soft">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11Z" />
        <circle cx="12" cy="10" r="2.4" />
      </svg>
      {place || "Japan"}
    </span>
  );
}
