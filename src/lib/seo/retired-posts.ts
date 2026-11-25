/**
 * Blog slugs that were archived on 2026-10-27 and have a genuine canonical
 * replacement. next.config.ts turns these into permanent redirects so the old
 * indexed URL passes to the rewritten post instead of 404ing.
 *
 * Archived slugs WITHOUT a replacement (the ~176 templated AI posts, the geo
 * "fish table games {state}" posts, the Cash App / Zelle / Bitcoin deposit
 * posts) are deliberately absent: they 404. A mass redirect of unrelated
 * content to one URL reads as a soft 404 and can taint the target.
 *
 * Keys and values are slugs, not paths. Keep this file dependency-free so
 * next.config.ts and scripts can import it.
 */
export const RETIRED_POST_REDIRECTS: Record<string, string> = {
  // bonus / money
  "50-percent-first-deposit-bonus-explained": "maximize-fish-table-bonus",
  "how-cash-out-works-casinovasgaming": "how-to-redeem-winnings-fast",
  "casinovasgaming-payment-methods-compared": "wallet-deposit-guide-casinovasgaming",
  "how-to-deposit-casinova": "wallet-deposit-guide-casinovasgaming",
  // rewards
  "refer-friends-earn-coins": "referral-program-earn-coins",
  "daily-rewards-free-coins-guide": "daily-rewards-coins-guide",
  "vip-program-guide-casinovasgaming": "casinovasgaming-vip-tiers-explained",
  "casinova-vip-rewards-explained": "casinovasgaming-vip-tiers-explained",
  // game guides consolidated
  "juwa-tips-and-strategies": "how-to-win-at-juwa",
  "juwa-advanced-tips-strategies": "how-to-win-at-juwa",
  "vblink-cash-frenzy-guide": "cash-frenzy-guide-tips",
  // coming-soon game stubs
  "fire-kirin-tips-and-tricks": "fire-kirin-orion-stars-alternatives",
  "orion-stars-tips-strategies": "fire-kirin-orion-stars-alternatives",
  "panda-master-tips-strategies": "fire-kirin-orion-stars-alternatives",
  "milky-way-advanced-strategies": "fire-kirin-orion-stars-alternatives",
  "vblink-game-guide": "fire-kirin-orion-stars-alternatives",
  "orion-stars-vs-fire-kirin": "fire-kirin-orion-stars-alternatives",
  "fire-kirin-vs-game-vault": "fire-kirin-orion-stars-alternatives",
  "game-vault-vs-orion-stars": "fire-kirin-orion-stars-alternatives",
  // 2026-11 phase 2: how-to, strategy and comparison posts for coming-soon games.
  // Each game keeps one honest status page; these point at it. Archive SQL:
  // supabase/blog-seed-2026-11-phase2-archive-coming-soon.sql (run with the deploy).
  "how-to-win-at-fire-kirin": "fire-kirin-online",
  "how-to-create-fire-kirin-account-online": "fire-kirin-online",
  "fire-kirin-advanced-tips": "fire-kirin-online",
  "how-to-win-at-orion-stars": "orion-stars-online",
  "how-to-create-orion-stars-account": "orion-stars-online",
  "orion-stars-advanced-guide": "orion-stars-online",
  "gameroom-vs-orion-stars": "orion-stars-online",
  "panda-master-vs-ultrapanda": "panda-master-online-guide",
  "vblink-vs-milky-way": "milky-way-fish-table-guide",
  "fire-kirin-vs-juwa-vs-orion-stars": "fire-kirin-orion-stars-alternatives",
};

export const RETIRED_POST_SLUGS: ReadonlySet<string> = new Set(Object.keys(RETIRED_POST_REDIRECTS));

/** Rows for next.config.ts `redirects()`. */
export function retiredPostRedirectRules() {
  return Object.entries(RETIRED_POST_REDIRECTS).map(([from, to]) => ({
    source: `/blog/${from}`,
    destination: `/blog/${to}`,
    permanent: true as const,
  }));
}
