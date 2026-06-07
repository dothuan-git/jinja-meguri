export default function Chip({
  label,
  sub,
  tone = "default",
}: {
  label: string;
  sub?: string | null;
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
      {sub ? <span className="jp text-[0.85em] opacity-70">{sub}</span> : null}
    </span>
  );
}
