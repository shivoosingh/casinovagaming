export interface Game {
  id: string;
  name: string;
  slug: string;
  image: string;
  provider: string;
  category: string;
  downloadUrl: string;
  /** Web player lobby. Opens in a new tab from the game page. */
  playUrl: string;
  /** SEO description — used in meta tags and game landing page */
  bio: string;
  players: number;
  gradient: string;
  popular?: boolean;
  trending?: boolean;
  upcoming?: boolean;
  promotional?: boolean;
  topRated?: boolean;
}

/**
 * Deposit match applied when a player loads a game, by deposit order:
 * 100% of the first deposit, 50% of the second, nothing after.
 * deposit-load-bonus.ts (the real payout) and offers.ts (every marketing string) read this.
 */
export const DEPOSIT_BONUS_SCHEDULE: readonly number[] = [1, 0.5];

/** Shared bonus & load rules shown on every game landing page */
export const GAME_BONUS_RULES = {
  firstTimeBonus: DEPOSIT_BONUS_SCHEDULE[0] * 100,
  secondDepositBonus: (DEPOSIT_BONUS_SCHEDULE[1] ?? 0) * 100,
  minDeposit: 5,
  maxDeposit: 500,
  /** Deposit wallet load → deposit redeem wallet */
  redeemMin: 3,
  redeemMax: 8,
} as const;

/** Bonus wallet load → bonus redeem wallet */
export const GAME_BONUS_REDEEM_RULES = {
  redeemMin: 7,
  redeemMax: 15,
} as const;

export const UPCOMING_GAME_MESSAGE =
  "This game is not available at the moment. Please check back soon!";

export const GAMES: Game[] = [
  {
    id: "8",
    name: "Orion Stars",
    slug: "orion-stars",
    image: "/games/orion-stars.webp",
    provider: "Orion Stars",
    category: "Arcade",
    downloadUrl: "http://start.orionstars.vip:8580/",
    playUrl: "http://play.orionstars.vip/",
    bio: "Orion Stars is an arcade-style app with fish games and slots. It is coming soon at Casinova Gaming and cannot be loaded yet. See the live games you can load today.",
    players: 25053,
    gradient: "from-zinc-500 via-zinc-600 to-zinc-800",
    popular: true,
    trending: true,
    topRated: true,
    upcoming: true,
  },
  {
    id: "7",
    name: "Game Vault",
    slug: "game-vault",
    image: "/games/game-vault.webp",
    provider: "Game Vault",
    category: "Vault",
    downloadUrl: "https://download.gamevault999.com/",
    playUrl: "https://www.gamevault999.com/",
    bio: "Game Vault is a vault-style lobby with slots, keno and fish games. Create your account through Casinova Gaming, load $5 to $500 from your wallet, and get a 100% match on your first deposit and 50% on your second.",
    players: 20902,
    gradient: "from-fuchsia-500 via-pink-600 to-purple-900",
    popular: true,
    trending: true,
    topRated: true,
  },
  {
    id: "3",
    name: "Juwa",
    slug: "juwa",
    image: "/games/juwa.webp",
    provider: "Juwa",
    category: "Casino",
    downloadUrl: "https://dl.juwa777.com/",
    playUrl: "https://dl.juwa777.com/",
    bio: "Juwa is a mobile app with fish games, slots and table-style games. Create your account through Casinova Gaming, load $5 to $500 from your wallet, and get a 100% match on your first deposit and 50% on your second.",
    players: 20047,
    gradient: "from-blue-400 via-blue-600 to-indigo-900",
    popular: true,
    trending: true,
    promotional: true,
    topRated: true,
  },
  {
    id: "1",
    name: "Fire Kirin",
    slug: "fire-kirin",
    image: "/games/fire-kirin.webp",
    provider: "Fire Kirin",
    category: "Fish Game",
    downloadUrl: "http://start.firekirin.xyz:8580/",
    playUrl: "https://play.firekirin.xyz/h5-firekirin777/",
    bio: "Fire Kirin is a fish shooting game app. It is coming soon at Casinova Gaming and cannot be loaded yet. See the live games you can load today.",
    players: 19426,
    gradient: "from-red-500 via-orange-600 to-red-900",
    popular: true,
    trending: true,
    upcoming: true,
  },
  {
    id: "16",
    name: "MR All In One",
    slug: "mr-all-in-one",
    image: "/games/mr-all-in-one.webp",
    provider: "MR All In One",
    category: "All-In-One",
    downloadUrl: "https://www.mrallinone777.com/",
    playUrl: "http://ab.mrallinone777.com/",
    bio: "MR All In One puts slots, fish games and keno in one app. Create your account through Casinova Gaming, load $5 to $500 from your wallet, and get a 100% match on your first deposit and 50% on your second.",
    players: 18200,
    gradient: "from-amber-400 via-orange-500 to-yellow-700",
    popular: true,
    trending: true,
    promotional: true,
  },
  {
    id: "11",
    name: "Cash Machine",
    slug: "cash-machine",
    image: "/games/cash-machine.webp",
    provider: "Cash Machine",
    category: "Slots",
    downloadUrl: "https://www.cashmachine777.com/",
    playUrl: "https://www.cashmachine777.com/",
    bio: "Cash Machine is a slots app. Create your account through Casinova Gaming, load $5 to $500 from your wallet, and get a 100% match on your first deposit and 50% on your second.",
    players: 17836,
    gradient: "from-emerald-500 via-green-600 to-teal-900",
    trending: true,
    promotional: true,
  },
  {
    id: "10",
    name: "Cash Frenzy",
    slug: "cash-frenzy",
    image: "/games/cash-frenzy.webp",
    provider: "Cash Frenzy",
    category: "Slots",
    downloadUrl: "https://www.cashfrenzy777.com/",
    playUrl: "http://ab.cashfrenzy777.com/",
    bio: "Cash Frenzy is a slots app. Create your account through Casinova Gaming, load $5 to $500 from your wallet, and get a 100% match on your first deposit and 50% on your second.",
    players: 17783,
    gradient: "from-lime-500 via-green-500 to-emerald-800",
    trending: true,
    promotional: true,
  },
  {
    id: "4",
    name: "Panda Master",
    slug: "panda-master",
    image: "/games/panda-master.webp",
    provider: "Panda Master",
    category: "Fish Game",
    downloadUrl: "https://pandamaster.vip:8888/index.html",
    playUrl: "https://play.pandamaster.vip/",
    bio: "Panda Master is a fish game app. It is coming soon at Casinova Gaming and cannot be loaded yet. See the live games you can load today.",
    players: 17586,
    gradient: "from-pink-400 via-rose-500 to-pink-900",
    popular: true,
    trending: true,
    upcoming: true,
  },
  {
    id: "13",
    name: "Vblink",
    slug: "vblink",
    image: "/games/vblink.webp",
    provider: "Vblink",
    category: "Arcade",
    downloadUrl: "https://www.vblink777.club/",
    playUrl: "https://www.vblink777.club/",
    bio: "Vblink is an arcade-style app with fish games and slots. It is coming soon at Casinova Gaming and cannot be loaded yet. See the live games you can load today.",
    players: 17435,
    gradient: "from-cyan-400 via-sky-600 to-blue-900",
    popular: true,
    trending: true,
    upcoming: true,
  },
  {
    id: "9",
    name: "Milky Way",
    slug: "milky-way",
    image: "/games/milky-way.webp",
    provider: "Milky Way",
    category: "Space",
    downloadUrl: "https://milkywayapp.xyz/",
    playUrl: "https://play.milkywayapp.xyz/",
    bio: "Milky Way is a space-themed app with slots and fish games. It is coming soon at Casinova Gaming and cannot be loaded yet. See the live games you can load today.",
    players: 17176,
    gradient: "from-violet-400 via-purple-600 to-indigo-900",
    popular: true,
    trending: true,
    upcoming: true,
  },
  {
    id: "6",
    name: "Vegas Sweeps",
    slug: "vegas-sweeps",
    image: "/games/vegas-sweeps.webp",
    provider: "Vegas Sweeps",
    category: "Sweepstakes",
    downloadUrl: "https://vegassweepsonline.com/",
    playUrl: "https://vegassweepsonline.com/",
    bio: "Vegas Sweeps is a sweepstakes app with slots, keno and fish games. Create your account through Casinova Gaming, load $5 to $500 from your wallet, and get a 100% match on your first deposit and 50% on your second.",
    players: 16510,
    gradient: "from-yellow-400 via-amber-500 to-orange-800",
    popular: true,
    trending: true,
    promotional: true,
  },
  {
    id: "14",
    name: "Ultrapanda",
    slug: "ultrapanda",
    image: "/games/ultrapanda.webp",
    provider: "Ultrapanda",
    category: "Fish Game",
    downloadUrl: "https://www.ultrapanda.mobi/",
    playUrl: "https://www.ultrapanda.mobi/",
    bio: "Ultrapanda is a fish and slots app. It is coming soon at Casinova Gaming and cannot be loaded yet. See the live games you can load today.",
    players: 16320,
    gradient: "from-red-400 via-rose-500 to-pink-800",
    upcoming: true,
  },
  {
    id: "15",
    name: "Gameroom",
    slug: "gameroom",
    image: "/games/gameroom.webp",
    provider: "Gameroom",
    category: "Arcade",
    downloadUrl: "https://www.gameroom777.com/m",
    playUrl: "http://ab.gameroom777.com/",
    bio: "Gameroom Online is an arcade-style lobby with slots, fish games and keno. Create your account through Casinova Gaming, load $5 to $500 from your wallet, and get a 100% match on your first deposit and 50% on your second.",
    players: 15890,
    gradient: "from-indigo-500 via-violet-600 to-purple-900",
    trending: true,
    promotional: true,
  },
  {
    id: "12",
    name: "Mafia",
    slug: "mafia",
    image: "/games/mafia.webp",
    provider: "Mafia",
    category: "Slots",
    downloadUrl: "https://www.mafia77777.com/m",
    playUrl: "http://ab.mafia77777.com/",
    bio: "Mafia Online is a mob-themed slots and arcade app. Create your account through Casinova Gaming, load $5 to $500 from your wallet, and get a 100% match on your first deposit and 50% on your second.",
    players: 15640,
    gradient: "from-neutral-600 via-stone-700 to-neutral-900",
    trending: true,
    promotional: true,
  },
];

export type GameTab = "all" | "popular" | "trending" | "upcoming" | "promotional" | "topRated";

export type HomeGameTab = "trending" | "all" | "promotional";

export function getGameBySlug(slug: string): Game | undefined {
  return GAMES.find((g) => g.slug === slug);
}

export function getOtherGames(slug: string, limit = 6): Game[] {
  return GAMES.filter((g) => g.slug !== slug && !g.upcoming)
    .sort((a, b) => b.players - a.players)
    .slice(0, limit);
}

export function filterGames(tab: GameTab, search: string): Game[] {
  let list = [...GAMES];

  if (tab === "all") {
    // Every game — live first, then coming soon (cards show SOON badge via game.upcoming).
    list.sort((a, b) => {
      if (Boolean(a.upcoming) !== Boolean(b.upcoming)) {
        return a.upcoming ? 1 : -1;
      }
      return b.players - a.players;
    });
  } else if (tab === "upcoming") {
    list = list.filter((g) => g.upcoming).sort((a, b) => b.players - a.players);
  } else {
    list = list.filter((g) => !g.upcoming).sort((a, b) => b.players - a.players);
    if (tab === "popular") list = list.filter((g) => g.popular);
    if (tab === "topRated") list = list.filter((g) => g.topRated);
    // trending & promotional tabs list every live game
  }

  if (search.trim()) {
    const q = search.toLowerCase();
    list = list.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        g.provider.toLowerCase().includes(q) ||
        g.bio.toLowerCase().includes(q)
    );
  }

  return list;
}

export function filterHomeGames(tab: HomeGameTab, search: string): Game[] {
  // Home trending & promotional tabs show every live game (non-upcoming).
  if (tab === "trending" || tab === "promotional") {
    let list = GAMES.filter((g) => !g.upcoming).sort((a, b) => b.players - a.players);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (g) =>
          g.name.toLowerCase().includes(q) ||
          g.provider.toLowerCase().includes(q) ||
          g.bio.toLowerCase().includes(q)
      );
    }
    return list;
  }
  return filterGames("all", search);
}

export function formatPlayers(n: number) {
  return n.toLocaleString();
}
