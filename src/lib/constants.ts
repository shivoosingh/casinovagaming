export const SITE_NAME = "Casinova Gaming";

/** Daily spin wheel is live (win rates capped server-side in prize-engine). */
export const DAILY_SPIN_ENABLED = true;

/** VIP points awarded per successful referral */
export const REFERRAL_REWARD_POINTS = 10;
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://casinovasgaming.com";
export const SITE_DESCRIPTION =
  "Casinova Gaming is your premium hub for Juwa casino, Game Vault, slot games, and fish games. Create game accounts fast, claim bonuses, earn VIP rewards, and get 24/7 live support.";

export const VIP_TIERS = [
  {
    id: "bronze",
    name: "Bronze",
    minPoints: 0,
    /** Share of a referred friend's first deposit, paid to the referrer. */
    referralRate: 0.05,
    color: "from-amber-700 to-[#0099cc]",
    benefits: ["Basic support", "5% referral bonus", "Weekly promotions"],
  },
  {
    id: "silver",
    name: "Silver",
    minPoints: 500,
    referralRate: 0.1,
    color: "from-slate-400 to-slate-300",
    benefits: ["Priority support", "10% referral bonus", "Exclusive games access"],
  },
  {
    id: "gold",
    name: "Gold",
    minPoints: 2000,
    referralRate: 0.15,
    color: "from-yellow-500 to-amber-400",
    benefits: ["24/7 VIP support", "15% referral bonus", "Early access to promotions"],
  },
  {
    id: "platinum",
    name: "Platinum",
    minPoints: 5000,
    referralRate: 0.25,
    color: "from-purple-400 to-cyan-400",
    benefits: ["Dedicated account manager", "25% referral bonus", "Custom rewards"],
  },
] as const;

export function vipTierForPoints(points: number): (typeof VIP_TIERS)[number]["id"] {
  if (points >= 5000) return "platinum";
  if (points >= 2000) return "gold";
  if (points >= 500) return "silver";
  return "bronze";
}

export function referralRateForTier(tier: string | null | undefined): number {
  return VIP_TIERS.find((item) => item.id === tier)?.referralRate ?? 0.05;
}

export const REQUEST_STATUSES = [
  "pending",
  "processing",
  "completed",
  "rejected",
] as const;

/** Indexable public pages listed in the sitemap. Login, register, and account pages stay out. */
export const PUBLIC_ROUTES = [
  { path: "/", priority: 1.0 },
  { path: "/games", priority: 0.9 },
  { path: "/promotions", priority: 0.9 },
  { path: "/vip", priority: 0.9 },
  { path: "/spin", priority: 0.85 },
  { path: "/blog", priority: 0.8 },
  { path: "/about", priority: 0.8 },
  { path: "/support", priority: 0.8 },
  { path: "/leaderboard", priority: 0.6 },
  { path: "/help", priority: 0.6 },
  { path: "/contact", priority: 0.6 },
  { path: "/responsible-play", priority: 0.4 },
  { path: "/privacy", priority: 0.4 },
  { path: "/terms", priority: 0.4 },
] as const;

/** Official Casinova Gaming social profile URLs — used in footer, tasks, and share buttons */
export const SOCIAL_LINKS = {
  telegram:
    process.env.NEXT_PUBLIC_TELEGRAM_URL ||
    "https://t.me/casinovagaming",
  facebook:
    process.env.NEXT_PUBLIC_FACEBOOK_URL ||
    "https://www.facebook.com/share/18mJGKyMNq/?mibextid=wwXIfr",
  instagram:
    process.env.NEXT_PUBLIC_INSTAGRAM_URL ||
    "https://www.instagram.com/casinovagaming/",
  // Old @spinora09 brand link removed; set NEXT_PUBLIC_TIKTOK_URL when the real profile is ready.
  tiktok: process.env.NEXT_PUBLIC_TIKTOK_URL || "",
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_URL || "https://wa.me/1234567890",
} as const;
