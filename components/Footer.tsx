import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-24 border-t hairline">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-10">
          <div className="max-w-md">
            <div className="flex items-baseline gap-3">
              <span className="font-display text-2xl font-semibold text-sumi">Jinja Meguri</span>
              <span className="jp text-sm text-sumi-soft">神社巡り</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-sumi-soft">
              A field guide to the shrines of Japan — their kami, lore, and festivals, surfaced in
              English with the original Japanese preserved. Curated, cited, and non-commercial.
            </p>
            <nav className="mt-5 flex gap-6 text-sm">
              <Link href="/shrines" className="navlink">
                Shrines
              </Link>
              <Link href="/calendar" className="navlink">
                Calendar
              </Link>
            </nav>
          </div>
          <p className="jp vertical-jp hidden text-sm text-sumi-soft/80 sm:block" aria-hidden>
            八百万の神
          </p>
        </div>
        <p className="mt-10 text-xs tracking-wide text-sumi-soft/70">
          © {new Date().getFullYear()} Jinja Meguri. Sources cited per shrine.
        </p>
      </div>
    </footer>
  );
}
