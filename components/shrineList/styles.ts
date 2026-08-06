// Canonical compact chip style shared by category + rank tags across the
// listing's table, mobile rows, and cards. Color comes from lib/facetColors.
// (The shrine detail/modal surfaces have their own CHIP in shrineEdit/detailStyles.)
export const CHIP =
  "text-[8.5px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border";

// Entrance animations stagger by row index. Capping the index keeps the cascade
// short and, more importantly, stops a large result set from spending seconds
// animating in every time a filter changes.
export const STAGGER_CAP = 10;
export const staggerDelay = (idx: number, step: number) => Math.min(idx, STAGGER_CAP) * step;
