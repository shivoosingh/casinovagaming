import { SITE_NAME, SITE_URL, SITE_DESCRIPTION, VIP_TIERS, PUBLIC_ROUTES, SOCIAL_LINKS } from "@/lib/constants";
import { GAMES, GAME_BONUS_RULES } from "@/lib/games";
import { HOME_FAQS } from "@/lib/seo/faq-data";
import { WELCOME_BONUS_PERCENT, SECOND_DEPOSIT_BONUS_PERCENT, MIN_DEPOSIT } from "@/lib/offers";
import { getPublishedBlogSlugs } from "@/lib/data/marketing";

/**
 * /llms.txt (https://llmstxt.org): a plain-text brief for AI assistants and
 * agents. Built from the same constants the site renders, so it cannot say
 * anything the pages do not. Rebuilt daily; the guide list is filtered to
 * slugs that are actually published.
 */
export const revalidate = 86400;

/** Hand-picked guides, in the order an assistant should read them. */
const GUIDES: { slug: string; label: string }[] = [
  { slug: "what-is-a-fish-table-game", label: "What a fish table game is" },
  { slug: "wallet-deposit-guide-casinovasgaming", label: "How to deposit by card" },
  { slug: "how-to-load-credits-from-wallet", label: "How to load game credits from the wallet" },
  { slug: "maximize-fish-table-bonus", label: "Deposit bonus: 100% first, 50% second" },
  { slug: "deposit-amounts-and-limits-casinova", label: "Minimum deposit and load limits" },
  { slug: "how-to-redeem-winnings-fast", label: "How to redeem: 3x threshold, 8x cap, ID review" },
  { slug: "casinova-id-verification-guide", label: "ID verification" },
  { slug: "daily-rewards-coins-guide", label: "Daily spin" },
  { slug: "casinovasgaming-vip-tiers-explained", label: "VIP tiers" },
  { slug: "referral-program-earn-coins", label: "Referral program" },
  { slug: "how-to-play-casinova-on-mobile", label: "Playing on Android or iPhone" },
  { slug: "best-fish-table-games-beginners", label: "Best games for beginners" },
  { slug: "how-to-choose-a-fish-table-game", label: "How to choose a game" },
  { slug: "are-online-fish-table-games-safe", label: "Safety checklist" },
  { slug: "fish-table-glossary", label: "Glossary" },
  { slug: "fire-kirin-orion-stars-alternatives", label: "Coming-soon games and what to play instead" },
  { slug: "game-vault-vs-juwa", label: "Game Vault vs Juwa" },
  { slug: "juwa-vs-vegas-sweeps", label: "Juwa vs Vegas Sweeps" },
  { slug: "how-to-win-at-juwa", label: "Playing Juwa well" },
  { slug: "game-vault-all-games-breakdown", label: "Game Vault explained" },
  { slug: "is-casinovasgaming-legit", label: "Is Casinova Gaming legit" },
  { slug: "what-are-sweepstakes-games", label: "What are sweepstakes games" },
];

export async function GET() {
  const live = GAMES.filter((g) => !g.upcoming);
  const soon = GAMES.filter((g) => g.upcoming);
  const published = new Set(await getPublishedBlogSlugs());
  const guides = GUIDES.filter((g) => published.size === 0 || published.has(g.slug));

  const lines: string[] = [
    `# ${SITE_NAME}`,
    "",
    `> ${SITE_DESCRIPTION}`,
    "",
    "## Key facts",
    "",
    `- Type: online sweepstakes gaming platform (not a licensed casino). Players must be 18+. Availability varies by jurisdiction; void where prohibited.`,
    `- Model: one wallet per player. Deposit by card, then load credits into a game account. Redeem from the game panel after review.`,
    `- Deposit bonus: ${WELCOME_BONUS_PERCENT}% match on the first deposit, ${SECOND_DEPOSIT_BONUS_PERCENT}% on the second, none after. Applied when the game is loaded.`,
    `- Load limits: $${MIN_DEPOSIT} minimum, $${GAME_BONUS_RULES.maxDeposit} maximum per load. Amounts round to the nearest dollar at load.`,
    `- Redeem rules: in-game balance must reach ${GAME_BONUS_RULES.redeemMin}x the load; total redeems capped at ${GAME_BONUS_RULES.redeemMax}x the load; approved government ID required; every redeem is reviewed by an admin. No payout-time promise.`,
    `- Payments: card only, through an instant payment partner. Cash App, Zelle, Venmo, PayPal, Chime and crypto are not offered.`,
    `- Daily spin: prizes $1, $2, $3, $4, $7, $10 or none; spins per 24h: Bronze 1, Silver 2, Gold 3, Platinum 3.`,
    `- VIP tiers (points): ${VIP_TIERS.map((t) => `${t.name} ${t.minPoints} (${Math.round(t.referralRate * 100)}% referral share)`).join(", ")}. Referral share is a percentage of a referred friend's first confirmed deposit, credited to the referrer's wallet; a referral also adds VIP points. VIP points: 1 per $1 on each confirmed deposit (minimum 1), 5 to 11 for the daily check-in, 10 per $1 of a spin prize.`,
    `- Not offered: promo codes, published odds or RTP.`,
    `- Support: 24/7 live chat at ${SITE_URL}/support. Telegram: ${SOCIAL_LINKS.telegram}.`,
    "",
    "## Live games (loadable now)",
    "",
    ...live.map((g) => `- [${g.name}](${SITE_URL}/games/${g.slug}): ${g.category}`),
    "",
    "## Coming soon (listed, not loadable)",
    "",
    ...soon.map((g) => `- ${g.name}`),
    "",
    "## Key pages",
    "",
    ...PUBLIC_ROUTES.map((r) => `- ${SITE_URL}${r.path}`),
    "",
    "## Guides",
    "",
    ...guides.map((g) => `- [${g.label}](${SITE_URL}/blog/${g.slug})`),
    "",
    "## FAQ",
    "",
    ...HOME_FAQS.flatMap((f) => [`- Q: ${f.q}`, `  A: ${f.a}`]),
    "",
  ];

  return new Response(lines.join("\n"), {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
