"use client";

/**
 * EN / 日本語 segmented control for the inline editors' floating bar. Flipping it
 * rebinds every `bilingual` prose field to its `_ja` sibling column so the admin
 * fills English and Japanese in place, in the same layout, one language at a time.
 */
export default function EditLangToggle({
  value,
  onChange,
}: {
  value: "en" | "ja";
  onChange: (lang: "en" | "ja") => void;
}) {
  const opts: { id: "en" | "ja"; label: string }[] = [
    { id: "en", label: "EN" },
    { id: "ja", label: "日本語" },
  ];
  return (
    <div className="flex items-center gap-0.5 rounded-full border border-moss/20 bg-washi/70 p-0.5 select-none">
      {opts.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          aria-pressed={value === o.id}
          className={`rounded-full px-2 py-0.5 text-[10px] font-mono font-bold tracking-widest transition-colors cursor-pointer ${
            value === o.id ? "bg-torii text-washi" : "text-moss-light hover:text-torii"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
