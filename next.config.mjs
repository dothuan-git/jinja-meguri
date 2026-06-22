/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Per-icon / per-export tree-shaking so a `import { X } from "lucide-react"`
  // (or motion) pulls only X into the client bundle instead of the barrel.
  experimental: {
    optimizePackageImports: ["lucide-react", "motion"],
  },
};
export default nextConfig;
