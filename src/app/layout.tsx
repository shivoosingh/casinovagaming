import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import { OrganizationSchema, WebsiteSchema, HomeGamesItemListSchema, HomeFaqSchema } from "@/lib/seo/json-ld";
import { homeMetadata } from "@/lib/seo/metadata";
import { ClientProviders } from "@/components/providers/client-providers";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  display: "swap",
  preload: true,
  adjustFontFallback: true,
  variable: "--font-outfit",
});

export const metadata: Metadata = homeMetadata;

export const viewport: Viewport = {
  themeColor: "#09090F",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${outfit.variable}`} suppressHydrationWarning>
      <head>
        <OrganizationSchema />
        <WebsiteSchema />
        <HomeGamesItemListSchema />
        <HomeFaqSchema />
        <link rel="icon" href="/logo.webp" />
        <link rel="preload" href="/logo.webp" as="image" type="image/webp" />
      </head>
      <body className={outfit.className} suppressHydrationWarning>
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
