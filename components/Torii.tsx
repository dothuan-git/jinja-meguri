export default function Torii({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 180" className={className} fill="currentColor" aria-hidden>
      {/* kasagi — gently curved top beam */}
      <path d="M4 28 Q100 12 196 28 L196 43 Q100 28 4 43 Z" />
      {/* nuki — second beam */}
      <rect x="28" y="58" width="144" height="13" rx="1" />
      {/* gakuzuka — center post */}
      <rect x="93" y="43" width="14" height="15" />
      {/* left pillar (splayed) */}
      <path d="M49 43 L63 43 L68 180 L44 180 Z" />
      {/* right pillar (splayed) */}
      <path d="M137 43 L151 43 L156 180 L132 180 Z" />
    </svg>
  );
}
