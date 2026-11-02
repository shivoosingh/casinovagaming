import { GAME_BONUS_RULES } from "@/lib/games";
import { VIP_TIERS } from "@/lib/constants";

/**
 * Single source of truth for marketing offer copy.
 *
 * Every CTA, banner, and sticky bar reads these values so the numbers shown to
 * visitors never drift from what the platform actually pays. Derived from the
 * real bonus rules in games.ts and the VIP tiers in constants.ts — change them
 * there, not here.
 */

/** First-deposit bonus, as a percentage. */
export const WELCOME_BONUS_PERCENT = GAME_BONUS_RULES.firstTimeBonus;
/** Second-deposit bonus, as a percentage. */
export const SECOND_DEPOSIT_BONUS_PERCENT = GAME_BONUS_RULES.secondDepositBonus;
/** Minimum deposit in USD to qualify for a load. */
export const MIN_DEPOSIT = GAME_BONUS_RULES.minDeposit;
/** Highest referral share across VIP tiers, as a percentage. */
export const MAX_REFERRAL_PERCENT = Math.round(
  Math.max(...VIP_TIERS.map((tier) => tier.referralRate)) * 100
);

/** Short hook used in inline banners. */
export const BONUS_HEADLINE = `${WELCOME_BONUS_PERCENT}% bonus on your first deposit, ${SECOND_DEPOSIT_BONUS_PERCENT}% on your second`;
/** Even shorter hook for the sticky mobile bar. */
export const BONUS_HEADLINE_SHORT = `${WELCOME_BONUS_PERCENT}% first deposit bonus`;
export const BONUS_SUBTEXT = `Applied when you load a game. Loads from $${MIN_DEPOSIT}. Free account, card deposits, 18+.`;

/**
 * Build a /register link that carries blog attribution.
 * Uses `src` + UTM params only — never `ref`, which is reserved for real
 * referral codes on the signup form.
 */
export function registerHref(source: string): string {
  const params = new URLSearchParams({
    src: source,
    utm_source: "blog",
    utm_medium: "cta",
    utm_campaign: source,
  });
  return `/register?${params.toString()}`;
}
