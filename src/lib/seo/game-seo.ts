import { GAME_BONUS_RULES, type Game } from "@/lib/games";
import { SITE_NAME, SITE_URL } from "@/lib/constants";

const GAME_KEYWORDS: Record<string, string[]> = {
  juwa: [
    "juwa casino",
    "juwa 777",
    "juwa slots",
    "juwa download",
    "juwa game",
    "juwa fish games",
    "juwa casino download",
    "juwa online casino",
  ],
  "game-vault": [
    "game vault casino",
    "game vault 999",
    "game vault slots",
    "game vault download",
    "game vault sweepstakes",
  ],
  "fire-kirin": [
    "fire kirin",
    "fire kirin fish game",
    "fire kirin download",
    "fish shooting game",
  ],
  "panda-master": ["panda master casino", "panda master slots", "panda master download"],
  "orion-stars": ["orion stars casino", "orion stars fish game", "orion stars download"],
  "vegas-sweeps": ["vegas sweeps", "vegas sweeps casino", "sweepstakes slots"],
  "cash-machine": ["cash machine casino", "cash machine slots"],
  "cash-frenzy": ["cash frenzy casino", "cash frenzy slots"],
  vblink: ["vblink casino", "vblink slots", "vblink download"],
  "milky-way": ["milky way casino", "milky way fish game"],
  ultrapanda: ["ultrapanda casino", "ultrapanda slots"],
  gameroom: ["gameroom casino", "gameroom slots"],
  mafia: ["mafia casino", "mafia slots"],
  "mr-all-in-one": ["mr all in one casino", "all in one slots"],
};

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Casino: ["slot games", "online slots", "mobile casino", "sweepstakes casino", "casino games"],
  "Fish Game": ["fish games", "fish shooting games", "fish table games", "arcade fish games"],
};

/**
 * What each live game's lobby contains, in plain words. Used for the meta
 * description and the on-page FAQ. Keep to the mix of game types only: no
 * payout, popularity or quality claims.
 */
const GAME_MIX: Record<string, string> = {
  "game-vault": "slots, keno and fish games",
  juwa: "fish games, slots and table-style games",
  "mr-all-in-one": "slots, fish games and keno in one app",
  "cash-machine": "slot games",
  "cash-frenzy": "slot games",
  "vegas-sweeps": "slots, keno and fish games",
  gameroom: "slots, fish games and keno",
  mafia: "mob-themed slots and arcade games",
};

export function getGameMix(game: Game): string | null {
  return GAME_MIX[game.slug] ?? null;
}

const GAME_TITLES: Record<string, string> = {
  juwa: "Juwa 777 Online: Account, Download & Load",
};

/** Kept to about 42 characters so the " | Casinova Gaming" suffix still fits in 60. */
export function getGameSeoTitle(game: Game): string {
  // A coming-soon game has no account or download to offer yet (its page is noindex).
  if (game.upcoming) return `${game.name}: Coming Soon`;
  return GAME_TITLES[game.slug] ?? `${game.name} Online: Account & Download`;
}

/** Meta description: under 160 characters, built from the real load and bonus rules. */
export function getGameSeoDescription(game: Game): string {
  if (game.upcoming) {
    return `${game.name} is coming soon at ${SITE_NAME} and cannot be loaded yet. See the games you can load today.`;
  }
  const mix = getGameMix(game);
  const lead = mix ? `${game.name}: ${mix}.` : `${game.name} at ${SITE_NAME}.`;
  return `${lead} Load $${GAME_BONUS_RULES.minDeposit} to $${GAME_BONUS_RULES.maxDeposit} at ${SITE_NAME}, ${GAME_BONUS_RULES.firstTimeBonus}% match on your first deposit, ${GAME_BONUS_RULES.secondDepositBonus}% on your second. 18+.`;
}

export function getGameSeoKeywords(game: Game): string[] {
  const base = [game.name, game.provider, game.category, "download", "game account", SITE_NAME];
  const slugSpecific = GAME_KEYWORDS[game.slug] ?? [];
  const category = CATEGORY_KEYWORDS[game.category] ?? [];
  return [...new Set([...base, ...slugSpecific, ...category])];
}

export function getGameSitemapPriority(game: Game): number {
  if (game.trending || game.popular) return 0.95;
  if (game.topRated) return 0.9;
  return 0.85;
}

export function getGamePageUrl(game: Game): string {
  return `${SITE_URL}/games/${game.slug}`;
}
