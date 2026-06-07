import type { SourceRow } from "@/lib/types";

export default function Sources({ sources }: { sources: SourceRow[] }) {
  if (!sources.length) return <p className="text-sm text-sumi-soft/70">No sources recorded.</p>;
  return (
    <ol data-testid="sources" className="space-y-2.5 text-sm">
      {sources.map((s, i) => (
        <li key={s.id} className="flex gap-2.5">
          <span className="select-none font-display text-vermilion-deep">{i + 1}.</span>
          <span className="leading-relaxed">
            <a
              href={s.url}
              target="_blank"
              rel="noreferrer noopener"
              className="underline decoration-[var(--hairline)] underline-offset-2 transition-colors hover:decoration-vermilion hover:text-vermilion-deep"
            >
              {s.title ?? s.url}
            </a>
            {s.source_type && (
              <span className="ml-2 rounded border hairline px-1.5 py-0.5 text-[0.65rem] uppercase tracking-wide text-sumi-soft">
                {s.source_type.replace(/_/g, " ")}
              </span>
            )}
            {s.note && <span className="text-sumi-soft"> — {s.note}</span>}
          </span>
        </li>
      ))}
    </ol>
  );
}
