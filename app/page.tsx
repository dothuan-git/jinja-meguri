import Link from "next/link";
import Torii from "@/components/Torii";

export default function Home() {
  return (
    <main className="relative overflow-hidden">
      {/* atmosphere */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {/* hinomaru — rising sun glow */}
        <div
          className="absolute right-[-8rem] top-[12%] h-[36rem] w-[36rem] rounded-full"
          style={{
            background:
              "radial-gradient(circle at center, rgba(197,54,43,0.18), rgba(197,54,43,0.06) 46%, transparent 70%)",
          }}
        />
        {/* faint torii motif */}
        <Torii className="absolute right-[1%] top-[6%] h-[80%] w-auto text-vermilion/[0.09]" />
        {/* lower warm settle */}
        <div
          className="absolute inset-x-0 bottom-0 h-1/3"
          style={{ background: "linear-gradient(180deg, transparent, rgba(235,227,213,0.55))" }}
        />
      </div>

      <section
        className="relative mx-auto flex max-w-6xl flex-col justify-center px-4 sm:px-6"
        style={{ minHeight: "calc(100vh - 66px)" }}
      >
        <p className="kicker reveal" style={{ animationDelay: "0.05s" }}>
          A field guide to the sacred
        </p>

        <h1
          className="reveal mt-5 font-display font-semibold leading-[0.9] text-sumi"
          style={{ fontSize: "clamp(3.5rem, 11vw, 9rem)", animationDelay: "0.12s" }}
        >
          Jinja
          <br />
          Meguri
        </h1>

        <p
          className="jp reveal mt-4 text-2xl tracking-[0.35em] text-vermilion-deep"
          style={{ animationDelay: "0.2s" }}
        >
          神社巡り
        </p>

        <p
          className="reveal mt-7 max-w-prose2 text-lg leading-relaxed text-sumi-soft"
          style={{ animationDelay: "0.28s" }}
        >
          Discover the shrines of Japan — the kami they enshrine, the lore that surrounds them, and
          the festivals that bring them to life. Researched in Japanese, told in English, with the
          original words kept intact.
        </p>

        <div
          className="reveal mt-10 flex flex-wrap items-center gap-6"
          style={{ animationDelay: "0.36s" }}
        >
          <Link
            href="/shrines"
            className="group inline-flex items-center gap-3 rounded-sm bg-sumi px-7 py-3.5 text-sm uppercase tracking-widest text-washi transition-colors hover:bg-vermilion-deep"
          >
            Explore the shrines
            <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
          </Link>
          <Link href="/calendar" className="navlink text-sumi-soft">
            View the festival calendar
          </Link>
        </div>

        <div
          className="reveal mt-16 flex flex-wrap gap-x-10 gap-y-2 text-xs uppercase tracking-widest text-sumi-soft/80"
          style={{ animationDelay: "0.46s" }}
        >
          <span>Eight regions</span>
          <span className="text-vermilion/60">·</span>
          <span>Canonical &amp; regional lore</span>
          <span className="text-vermilion/60">·</span>
          <span>Living festivals</span>
        </div>
      </section>
    </main>
  );
}
