import type { ShrineDetail } from "@/lib/types";
import Chip from "@/components/ui/Chip";
import PinHint from "@/components/ui/PinHint";
import Sources from "@/components/Sources";
import ShrineMap from "@/components/ShrineMap";
import ImagePlaceholder from "@/components/ImagePlaceholder";

function Section({ title, ja, children }: { title: string; ja?: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="flex items-baseline gap-2 font-display text-2xl font-semibold">
        {title}
        {ja && <span className="jp text-base text-sumi-soft">{ja}</span>}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Prose({ label, text }: { label: string; text: string | null }) {
  if (!text) return null;
  return (
    <div className="mb-4">
      <p className="kicker mb-1">{label}</p>
      <p className="leading-relaxed text-sumi/90">{text}</p>
    </div>
  );
}

function AccessBadge({ type }: { type: string | null }) {
  if (!type) return null;
  const witness = type === "public_witness";
  return (
    <span
      className={
        "rounded-full px-2.5 py-0.5 text-[0.7rem] uppercase tracking-wide " +
        (witness ? "bg-sumi/10 text-sumi" : "bg-vermilion/15 text-vermilion-deep")
      }
    >
      {witness ? "Public witness" : "Pilgrimage experience"}
    </span>
  );
}

export default function ShrineDetailView({
  shrine,
  variant,
}: {
  shrine: ShrineDetail;
  variant: "page" | "modal";
}) {
  const titleSize = variant === "modal" ? "text-4xl" : "text-5xl sm:text-6xl";
  const hasProse =
    shrine.details &&
    (shrine.details.history ||
      shrine.details.why_visit ||
      shrine.details.prayer_focus ||
      shrine.details.best_season);

  return (
    <article>
      <header>
        {shrine.highest_rank && (
          <p className="kicker mb-2 inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-vermilion" />
            {shrine.highest_rank.name_en}
            {shrine.highest_rank.name_ja && <span className="jp">{shrine.highest_rank.name_ja}</span>}
          </p>
        )}
        <h1 className={`font-display font-semibold leading-[0.95] ${titleSize}`}>{shrine.name_en}</h1>
        {shrine.name_ja && <p className="jp mt-1 text-xl text-vermilion-deep">{shrine.name_ja}</p>}
        <div className="mt-3">
          <PinHint city={shrine.city} prefecture={shrine.prefecture} />
        </div>
      </header>

      <div className="mt-6">
        <ImagePlaceholder />
      </div>

      {shrine.categories.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-1.5">
          {shrine.categories.map((c) => (
            <Chip key={c.code} label={c.name_en} sub={c.name_ja} tone="accent" />
          ))}
        </div>
      )}

      <Section title="Enshrined kami" ja="祭神">
        <ul className="space-y-6">
          {shrine.deities.map((d) => (
            <li key={d.id} className="border-l-2 border-[var(--hairline)] pl-4">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="font-display text-xl">{d.name_romaji}</span>
                {d.name_kanji && <span className="jp text-sumi-soft">{d.name_kanji}</span>}
                {d.is_primary && <span className="kicker text-vermilion-deep">Principal</span>}
              </div>
              {(d.role || d.title || d.domain) && (
                <p className="mt-0.5 text-sm text-sumi-soft">
                  {[d.role, d.title, d.domain].filter(Boolean).join(" · ")}
                </p>
              )}
              {d.lore && (
                <p className="mt-2 leading-relaxed text-sumi/90">
                  {d.is_regional && (
                    <span className="mr-2 rounded border border-vermilion/40 px-1.5 py-0.5 align-middle text-[0.62rem] uppercase tracking-wide text-vermilion-deep">
                      Regional lore
                    </span>
                  )}
                  {d.lore}
                </p>
              )}
            </li>
          ))}
        </ul>
      </Section>

      {shrine.ranks.length > 0 && (
        <Section title="Rank" ja="社格">
          <div className="flex flex-wrap gap-2">
            {shrine.ranks.map((r) => (
              <span
                key={r.code}
                className={
                  "inline-flex items-baseline gap-1 rounded border px-2.5 py-1 text-sm " +
                  (r.is_highest
                    ? "border-vermilion bg-vermilion/10 text-vermilion-deep"
                    : "border-[var(--hairline)] text-sumi-soft")
                }
              >
                {r.name_en}
                {r.name_ja && <span className="jp text-xs opacity-80">{r.name_ja}</span>}
                {r.is_highest && <span className="kicker ml-1">Highest</span>}
              </span>
            ))}
          </div>
        </Section>
      )}

      {hasProse && (
        <Section title="About" ja="由緒">
          <Prose label="History" text={shrine.details!.history} />
          <Prose label="Why visit" text={shrine.details!.why_visit} />
          <Prose label="Prayer focus" text={shrine.details!.prayer_focus} />
          <Prose label="Best season" text={shrine.details!.best_season} />
        </Section>
      )}

      {shrine.events.length > 0 && (
        <Section title="Festivals" ja="祭">
          <ul className="space-y-8">
            {shrine.events.map((e) => (
              <li key={e.id}>
                <div className="flex flex-wrap items-baseline gap-2">
                  <h3 className="font-display text-xl">{e.name_en}</h3>
                  {e.name_ja && <span className="jp text-sumi-soft">{e.name_ja}</span>}
                  <span className="ml-auto">
                    <AccessBadge type={e.access_type} />
                  </span>
                </div>
                {e.time_prose && <p className="mt-1 text-sm italic text-sumi-soft">{e.time_prose}</p>}
                <div className="mt-3">
                  <Prose label="Origin" text={e.origin} />
                  <Prose label="Meaning" text={e.meaning} />
                  <Prose label="Ritual" text={e.ritual} />
                  <Prose label="Prayer" text={e.prayer} />
                  <Prose label="Visitor notes" text={e.visitor_notes} />
                </div>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Location" ja="地図">
        {shrine.address && <p className="mb-3 text-sm text-sumi-soft">{shrine.address}</p>}
        <ShrineMap coordinates={shrine.coordinates} name={shrine.name_en} city={shrine.city} />
      </Section>

      <Section title="Sources" ja="出典">
        <Sources sources={shrine.sources} />
      </Section>
    </article>
  );
}
