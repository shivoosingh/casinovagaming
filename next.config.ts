import type { NextConfig } from "next";
import { retiredPostRedirectRules } from "./src/lib/seo/retired-posts";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  poweredByHeader: false,
  compress: true,
  async redirects() {
    return [
      // One canonical host: www duplicates every page and splits ranking signals.
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.casinovasgaming.com" }],
        destination: "https://casinovasgaming.com/:path*",
        permanent: true,
      },
      // Archived blog slugs that have a rewritten replacement (see src/lib/seo/retired-posts.ts).
      ...retiredPostRedirectRules(),
    ];
  },
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production" ? { exclude: ["error"] } : false,
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
      {
        protocol: "https",
        hostname: "images.pexels.com",
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
    optimizePackageImports: [
      "lucide-react",
      "framer-motion",
      "sonner",
      "@supabase/supabase-js",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-select",
    ],
  },
};

export default nextConfig;
