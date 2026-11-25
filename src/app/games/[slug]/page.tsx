import { notFound } from "next/navigation";
import { GamePageShell } from "@/components/games/game-page-shell";
import { createMetadata } from "@/lib/seo/metadata";
import { getGameSeoDescription, getGameSeoKeywords, getGameSeoTitle } from "@/lib/seo/game-seo";
import { BreadcrumbSchema, GamePageSchema } from "@/lib/seo/json-ld";
import { SITE_URL } from "@/lib/constants";
import { GAMES, getGameBySlug } from "@/lib/games";
import { isWalletLoadEnabledForGame } from "@/lib/game-automation/config";
import { getMyGameAccount } from "@/lib/actions/game-loads";
import { getActivePaymentMethods } from "@/lib/data/payments";
import { getPublishedBlogPosts } from "@/lib/data/marketing";
import { GameGuides } from "@/components/games/game-guides";
import { unstable_cache } from "next/cache";

// This page renders per request (it shows the signed-in player's game account),
// so the guide list is cached rather than queried on every hit.
const getCachedGuidePosts = unstable_cache(getPublishedBlogPosts, ["game-page-guide-posts"], {
  revalidate: 600,
});

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface GamePageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ create?: string }>;
}

export function generateStaticParams() {
  return GAMES.map((game) => ({ slug: game.slug }));
}

export async function generateMetadata({ params }: GamePageProps) {
  const { slug } = await params;
  const game = getGameBySlug(slug);
  if (!game) return {};

  const base = createMetadata({
    title: getGameSeoTitle(game),
    description: getGameSeoDescription(game),
    keywords: getGameSeoKeywords(game),
    path: `/games/${game.slug}`,
    ogImage: game.image,
  });
  // A game that cannot be loaded yet must not compete in search as if it were live.
  return game.upcoming ? { ...base, robots: { index: false, follow: true } } : base;
}

export default async function GamePage({ params, searchParams }: GamePageProps) {
  const { slug } = await params;
  const { create } = await searchParams;
  const game = getGameBySlug(slug);

  if (!game) notFound();

  const walletLoadEnabled = isWalletLoadEnabledForGame(game.slug);
  const [initialGameAccount, paymentMethods, guidePosts] = await Promise.all([
    walletLoadEnabled ? getMyGameAccount(game.slug) : Promise.resolve(null),
    game.upcoming ? Promise.resolve([]) : getActivePaymentMethods(),
    game.upcoming ? Promise.resolve([]) : getCachedGuidePosts().catch(() => []),
  ]);

  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: "Home", url: SITE_URL },
          { name: "Games", url: `${SITE_URL}/games` },
          { name: game.name, url: `${SITE_URL}/games/${game.slug}` },
        ]}
      />
      <GamePageSchema game={game} />
      <GamePageShell
        game={game}
        autoCreate={create === "1"}
        walletLoadEnabled={walletLoadEnabled}
        paymentMethods={paymentMethods}
        initialGameAccount={initialGameAccount}
        guides={<GameGuides game={game} posts={guidePosts} />}
      />
    </>
  );
}
