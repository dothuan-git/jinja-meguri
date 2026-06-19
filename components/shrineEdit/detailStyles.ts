// Canonical text-role + chip classes shared by the shrine detail view and the
// create-flow deity/festival editors, so the "add shrine" page reads identically
// to a real detail page. Layout utilities stay at the call site.

// Compact chip style shared with the shrine listing (table + cards).
export const CHIP =
  "text-[8.5px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border";

// One canonical class string per text role.
// serif = headings/quotes/lore · sans = informational prose · mono = labels/meta.
export const typo = {
  eyebrow: "text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-moss-light",
  sectionTitle: "text-2xl font-serif font-black text-stone",
  subheading: "text-xl md:text-xl font-serif font-black text-stone leading-tight",
  subheadingSm: "text-sm md:text-base font-serif font-black text-stone leading-tight",
  fieldLabel: "text-[9px] font-mono font-bold uppercase tracking-wider text-moss/50",
  prose: "text-xs md:text-sm font-sans text-stone/80 leading-relaxed text-justify",
  quote: "text-base font-quote italic text-stone/85 leading-relaxed border-l-2 border-torii/30 pl-4",
  lore: "text-xs md:text-sm font-quote italic text-stone/75 leading-relaxed border-l border-moss/20 pl-3.5",
  meta: "text-xs font-mono text-stone/50 tracking-wide",
} as const;
