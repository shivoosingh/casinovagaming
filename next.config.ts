import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  poweredByHeader: false,
  compress: true,
  async redirects() {
    // One canonical host: www duplicates every page and splits ranking signals.
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.casinovasgaming.com" }],
        destination: "https://casinovasgaming.com/:path*",
        permanent: true,
      },
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
