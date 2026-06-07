import Link from "next/link";
import SearchBox from "@/components/SearchBox";

export default function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b hairline bg-washi/85 backdrop-blur supports-[backdrop-filter]:bg-washi/70">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-3" aria-label="Jinja Meguri — home">
          <span className="seal" aria-hidden>
            神
          </span>
          <span className="leading-none">
            <span className="block font-display text-[1.35rem] font-semibold tracking-wide text-sumi">
              Jinja Meguri
            </span>
            <span className="jp mt-0.5 block text-[10px] tracking-[0.42em] text-sumi-soft">神社巡り</span>
          </span>
        </Link>

        <nav className="ml-auto flex items-center gap-7 text-[0.95rem]">
          <Link href="/shrines" className="navlink">
            Shrines
          </Link>
          <Link href="/calendar" className="navlink">
            Calendar
          </Link>
        </nav>

        <div className="hidden md:block">
          <SearchBox />
        </div>
      </div>
    </header>
  );
}
