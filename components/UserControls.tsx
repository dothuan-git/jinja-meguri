"use client";

/**
 * Floating "User Controls" bar for signed-in non-admin users — mirrors the
 * Admin Controls pill. Scaffold only; concrete actions are TBD. Currently
 * mounted on the shrine listing; extend to other surfaces as features land.
 */
export default function UserControls() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-5 pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-moss/15 bg-washi/75 backdrop-blur-md px-4 py-2.5 shadow-lg">
        <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-moss select-none">
          User Controls
        </span>
        <span className="text-stone/25 font-mono select-none text-xs">|</span>
        <span className="text-[10px] font-mono uppercase tracking-widest text-moss-light select-none">
          Coming soon
        </span>
      </div>
    </div>
  );
}
