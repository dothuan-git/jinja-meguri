export default function Chip({
  label,
  sub,
  subIsJa = true,
  tone = "default",
}: {
  label: string;
  sub?: string | null;
  // Whether the sub is Japanese script (drives the `jp` font class) — false
  // when the JA locale swaps a romaji/EN reading into the sub slot.
  subIsJa?: boolean;
  tone?: "default" | "accent";
}) {
  return (
    <span
      className={
        "inline-flex items-baseline gap-1 rounded-full border px-2.5 py-0.5 text-xs leading-relaxed " +
        (tone === "accent"
          ? "border-vermilion/40 bg-vermilion/10 text-vermilion-deep"
          : "border-[var(--hairline)] bg-washi text-sumi-soft")
      }
    >
      {label}
      {sub ? <span className={`${subIsJa ? "jp " : ""}text-[0.85em] opacity-70`}>{sub}</span> : null}
    </span>
  );
}
