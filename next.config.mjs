import createNextIntlPlugin from "next-intl/plugin";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Per-icon / per-export tree-shaking so a `import { X } from "lucide-react"`
  // (or motion) pulls only X into the client bundle instead of the barrel.
  experimental: {
    optimizePackageImports: ["lucide-react", "motion"],
  },
};

// Reads the locale cookie via ./i18n/request.ts (no locale segment in URLs).
const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);
