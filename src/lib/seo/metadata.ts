import type { Metadata } from "next";
import { SITE_NAME, SITE_URL, SITE_DESCRIPTION } from "@/lib/constants";

interface PageSEO {
  title: string;
  description: string;
  keywords: string[];
  path: string;
  ogImage?: string;
  documentTitle?: string;
}

export function createMetadata({
  title,
  description,
  keywords,
  path,
  ogImage = "/logo.webp",
  documentTitle,
}: PageSEO): Metadata {
  const fullTitle =
    documentTitle ??
    (title === SITE_NAME ? `${SITE_NAME} | Premium Gaming Platform` : `${title} | ${SITE_NAME}`);
  const url = `${SITE_URL}${path}`;

  return {
    title: fullTitle,
    description,
    keywords: keywords.join(", "),
    authors: [{ name: SITE_NAME }],
    creator: SITE_NAME,
    publisher: SITE_NAME,
    metadataBase: new URL(SITE_URL),
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      locale: "en_US",
      url,
      title: fullTitle,
      description,
      siteName: SITE_NAME,
      images: [{ url: ogImage, width: 1200, height: 630, alt: SITE_NAME }],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [ogImage],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true },
    },
  };
}

export const homeMetadata = createMetadata({
  title: SITE_NAME,
  documentTitle: "Casinova Gaming | Juwa, Game Vault, Fish Table & Slot Games",
  description:
    "Play Juwa, Game Vault, Vegas Sweeps and more fish table and slot games. One wallet, card deposits, a 100% first-deposit match and 24/7 live chat. 18+.",
  keywords: [
    "Casinova Gaming",
    "juwa casino",
    "juwa 777",
    "juwa slots",
    "slot games",
    "fish games",
    "game vault casino",
    "sweepstakes games",
    "fish table games online",
    "sweepstakes slots",
    "fire kirin",
    "panda master",
    "orion stars",
    "vegas sweeps",
    "game accounts",
    "VIP gaming rewards",
  ],
  path: "/",
});

export const promotionsMetadata = createMetadata({
  title: "Promotions & Bonuses",
  description:
    "Current Casinova Gaming promotions: the 100% first-deposit and 50% second-deposit match, daily spin prizes, and VIP referral rewards.",
  keywords: ["gaming promotions", "deposit bonus", "Casinova Gaming deals", "VIP bonuses", "gaming rewards"],
  path: "/promotions",
});

export const vipMetadata = createMetadata({
  title: "VIP Rewards Program",
  description:
    "Join the Casinova Gaming VIP program. Earn points, unlock Bronze to Platinum tiers, and enjoy exclusive gaming benefits and rewards.",
  keywords: ["VIP gaming", "loyalty program", "gaming rewards", "Casinova Gaming VIP", "premium gaming"],
  path: "/vip",
});

export const aboutMetadata = createMetadata({
  title: "About Casinova Gaming",
  documentTitle: "About Casinova Gaming",
  description:
    "Who runs Casinova Gaming, how the one-wallet sweepstakes platform works, and how deposits, ID checks and redeems are handled.",
  keywords: ["about Casinova Gaming", "gaming support platform", "trusted gaming", "game account service"],
  path: "/about",
});

export const supportMetadata = createMetadata({
  title: "Support & Help Center",
  description:
    "Get help with Casinova Gaming. Contact our 24/7 live chat support team for game accounts, VIP questions, and technical assistance.",
  keywords: ["gaming support", "live chat help", "Casinova Gaming support", "game account help", "customer service"],
  path: "/support",
});
