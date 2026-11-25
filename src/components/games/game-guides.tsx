import Link from "next/link";
import { BookOpen, HelpCircle } from "lucide-react";

import { GAME_BONUS_RULES, type Game } from "@/lib/games";
import type { MarketingPost } from "@/lib/data/marketing";
import { findGameForPost } from "@/lib/seo/game-match";
import { getGameMix } from "@/lib/seo/game-seo";
import { FaqSchema } from "@/lib/seo/json-ld";
import { SITE_NAME } from "@/lib/constants";

/** Platform guides every game page can fall back on. All are published, hand-written posts. */
const CORE_GUIDES = [
  { slug: "wallet-deposit-guide-casinovasgaming", label: "How to deposit by card" },
  { slug: "how-to-load-credits-from-wallet", label: "How to load game credits from your wallet" },
  { slug: "how-to-redeem-winnings-fast", label: "How redeem works: 3x threshold, 8x cap, ID review" },
  { slug: "maximize-fish-table-bonus", label: "How the deposit match works" },
] as const;

const MAX_GAME_GUIDES = 5;

/**
 * Questions answered from the real load, bonus and redeem rules in games.ts.
 * The same list feeds the visible section and the FAQPage JSON-LD, so the
 * markup can never say something the page does not show.
 */
export function gameFaqs(game: Game): { q: string; a: string }[] {
  const r = GAME_BONUS_RULES;
  const mix = getGameMix(game);
  return [
    ...(mix
      ? [{ q: `What kind of games does ${game.name} have?`, a: `${game.name} has ${mix}. It is a third-party app; ${SITE_NAME} is where you create the account and load it.` }]
      : []),
    {
      q: `How do I get a ${game.name} account?`,
      a: `Create a free ${SITE_NAME} account, open this page and press Create Account. Your ${game.name} login details are shown on this page once the account is ready. You must be 18 or older.`,
    },
    {
      q: `How much can I load into ${game.name}?`,
      a: `Between $${r.minDeposit} and $${r.maxDeposit} per load, taken from your ${SITE_NAME} wallet. Wallet deposits are by card.`,
    },
    {
      q: `Is there a bonus on ${game.name}?`,
      a: `Yes. Your first deposit is matched ${r.firstTimeBonus}% and your second ${r.secondDepositBonus}%, with no match after that. The match is applied when you load the game. There are no promo codes.`,
    },
    {
      q: `How do I redeem from ${game.name}?`,
      a: `A redeem opens once your in-game balance reaches ${r.redeemMin}x the amount you loaded, and total redeems are capped at ${r.redeemMax}x the load. You need an approved government ID, and every redeem is reviewed by staff.`,
    },
  ];
}

/** Published posts about this game, newest first. Fallback placeholder posts are never linked. */
export function guidesForGame(game: Game, posts: MarketingPost[]): MarketingPost[] {
  return posts
    .filter((post) => !post.id.startsWith("fallback-") && findGameForPost(post)?.slug === game.slug)
    .slice(0, MAX_GAME_GUIDES);
}

/**
 * Server-rendered FAQ and guide links for a live game page. Gives crawlers real
 * text about the game and links the hub page down to its guides.
 */
export function GameGuides({ game, posts }: { game: Game; posts: MarketingPost[] }) {
  if (game.upcoming) return null;

  const faqs = gameFaqs(game);
  const gameGuides = guidesForGame(game, posts);
  const published = new Set(posts.map((post) => post.slug));
  const coreGuides = CORE_GUIDES.filter((guide) => published.has(guide.slug));

  return (
    <>
      <FaqSchema items={faqs} />

      <section className="rounded-2xl border border-[rgba(255,255,255,0.07)] bg-[#0d0d1f] p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-violet-400" aria-hidden />
          <h2 className="font-bold text-[#f0f0f5]">{game.name} questions</h2>
        </div>
        <div className="space-y-4">
          {faqs.map((faq) => (
            <div key={faq.q}>
              <h3 className="text-sm font-semibold text-[#f0f0f5]">{faq.q}</h3>
              <p className="mt-1 text-sm leading-relaxed text-[#9a9cb8]">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      {(gameGuides.length > 0 || coreGuides.length > 0) && (
        <section className="rounded-2xl border border-[rgba(255,255,255,0.07)] bg-[#0d0d1f] p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-violet-400" aria-hidden />
            <h2 className="font-bold text-[#f0f0f5]">{game.name} guides</h2>
          </div>
          <ul className="space-y-2 text-sm">
            {gameGuides.map((post) => (
              <li key={post.slug}>
                <Link href={`/blog/${post.slug}`} className="text-violet-300 hover:text-[#00E5FF]">
                  {post.title}
                </Link>
              </li>
            ))}
            {coreGuides.map((guide) => (
              <li key={guide.slug}>
                <Link href={`/blog/${guide.slug}`} className="text-violet-300 hover:text-[#00E5FF]">
                  {guide.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
