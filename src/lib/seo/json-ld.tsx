import { SITE_NAME, SITE_URL, SITE_DESCRIPTION, SOCIAL_LINKS } from "@/lib/constants";
import { GAMES } from "@/lib/games";
import type { Game } from "@/lib/games";
import { getGamePageUrl } from "@/lib/seo/game-seo";
import { HOME_FAQS } from "@/lib/seo/faq-data";

interface JsonLdProps {
  data: Record<string, unknown>;
}

export function JsonLd({ data }: JsonLdProps) {
  // "<" escaped so a stray "</script>" inside content can never break out of the tag.
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}

export function OrganizationSchema() {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "Organization",
        name: SITE_NAME,
        url: SITE_URL,
        logo: `${SITE_URL}/logo.webp`,
        description: SITE_DESCRIPTION,
        sameAs: Object.values(SOCIAL_LINKS).filter(
          (url) => typeof url === "string" && /^https?:\/\//.test(url) && !/1234567890|your-/.test(url)
        ),
        contactPoint: {
          "@type": "ContactPoint",
          contactType: "customer support",
          availableLanguage: "English",
        },
      }}
    />
  );
}

export function WebsiteSchema() {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: SITE_NAME,
        url: SITE_URL,
        description: SITE_DESCRIPTION,
      }}
    />
  );
}

export function BreadcrumbSchema({ items }: { items: { name: string; url: string }[] }) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: items.map((item, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: item.name,
          item: item.url,
        })),
      }}
    />
  );
}

export function HomeGamesItemListSchema() {
  const games = GAMES.filter((game) => !game.upcoming);

  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: `${SITE_NAME} live games`,
        description: `Juwa, Game Vault, fish table and slot games you can load on ${SITE_NAME} today.`,
        numberOfItems: games.length,
        itemListElement: games.map((game, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: game.name,
          url: getGamePageUrl(game),
        })),
      }}
    />
  );
}

export function HomeFaqSchema() {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: HOME_FAQS.map((faq) => ({
          "@type": "Question",
          name: faq.q,
          acceptedAnswer: {
            "@type": "Answer",
            text: faq.a,
          },
        })),
      }}
    />
  );
}

export function GamePageSchema({ game }: { game: Game }) {
  const pageUrl = getGamePageUrl(game);

  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "VideoGame",
        name: game.name,
        description: game.bio,
        url: pageUrl,
        image: `${SITE_URL}${game.image}`,
        applicationCategory: "Game",
        operatingSystem: "Android, iOS",
        // Only a loadable game has a real offer. Coming-soon games must not claim InStock.
        ...(game.upcoming
          ? {}
          : {
              offers: {
                "@type": "Offer",
                url: pageUrl,
                price: "0",
                priceCurrency: "USD",
                availability: "https://schema.org/InStock",
              },
            }),
        publisher: {
          "@type": "Organization",
          name: game.provider,
        },
      }}
    />
  );
}

export function ArticleSchema({
  title,
  description,
  slug,
  image,
  publishedAt,
  updatedAt,
}: {
  title: string;
  description?: string | null;
  slug: string;
  image?: string | null;
  publishedAt?: string | null;
  /** Pass only when the post was genuinely edited after publish. */
  updatedAt?: string | null;
}) {
  const url = `${SITE_URL}/blog/${slug}`;
  const imageUrl = image ? (image.startsWith("http") ? image : `${SITE_URL}${image}`) : `${SITE_URL}/logo.webp`;

  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        headline: title,
        ...(description ? { description } : {}),
        url,
        mainEntityOfPage: url,
        image: imageUrl,
        ...(publishedAt ? { datePublished: publishedAt } : {}),
        ...(updatedAt ? { dateModified: updatedAt } : publishedAt ? { dateModified: publishedAt } : {}),
        author: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
        publisher: {
          "@type": "Organization",
          name: SITE_NAME,
          logo: { "@type": "ImageObject", url: `${SITE_URL}/logo.webp` },
        },
      }}
    />
  );
}

export function FaqSchema({ items }: { items: { q: string; a: string }[] }) {
  if (items.length === 0) return null;
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: items.map((faq) => ({
          "@type": "Question",
          name: faq.q,
          acceptedAnswer: { "@type": "Answer", text: faq.a },
        })),
      }}
    />
  );
}
