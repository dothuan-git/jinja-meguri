import Link from "next/link";

/** Themed centered card wrapper shared by the sign-in / sign-up forms. */
export default function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center px-5 py-12">
      <div className="rounded-2xl border border-moss/15 bg-washi/75 px-7 py-9 shadow-sm backdrop-blur-md">
        <Link href="/" className="mb-6 flex items-center justify-center gap-2 select-none">
          <span className="hanko-seal flex h-7 w-7 items-center justify-center rounded-xs p-0.5 text-[15px] font-black">
            神
          </span>
        </Link>
        <h1 className="text-center font-display text-2xl font-bold text-stone">{title}</h1>
        {subtitle && (
          <p className="mt-2 text-center text-sm text-moss-light">{subtitle}</p>
        )}
        <div className="mt-7">{children}</div>
      </div>
      {footer && (
        <div className="mt-5 text-center text-xs tracking-widest uppercase text-moss-light">
          {footer}
        </div>
      )}
    </div>
  );
}
