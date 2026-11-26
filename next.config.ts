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
      // The default Vercel hostname serves a full public copy of the site and is
      // what the GitHub repository links to. Send its pages to the real domain so
      // any link to it lands on (and credits) casinovasgaming.com. API routes and
      // the auth callback are left alone in case a provider is configured with
      // this hostname.
      {
        source: "/:path((?!api/|auth/|_next/).*)",
        // Both stable production hostnames; per-deployment preview URLs are not matched.
        has: [{ type: "host", value: "casinovagaming(?:-darks-projects-0d253498)?\\.vercel\\.app" }],
        destination: "https://casinovasgaming.com/:path",
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
