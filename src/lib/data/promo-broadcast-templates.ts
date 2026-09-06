export type PromoBroadcastType = "info" | "success" | "warning" | "promo";

export type PromoBroadcastTemplate = {
  id: string;
  label: string;
  emoji: string;
  description: string;
  title: string;
  message: string;
  type: PromoBroadcastType;
  promoCode?: string;
};

const SITE = "Casinova Gaming";

export const PROMO_BROADCAST_TEMPLATES: PromoBroadcastTemplate[] = [
  {
    id: "deposit-bonus-100",
    label: "Deposit bonus",
    emoji: "💰",
    description: "100% deposit match offer",
    type: "promo",
    promoCode: "ROYALE100",
    title: "100% Deposit Match — Double Your Play!",
    message:
      `🎉 ${SITE} exclusive: Deposit today and get a 100% match bonus on your wallet!\n\nUse code ROYALE100 at checkout. Load any game — Juwa, Game Vault, Orion Stars & more.\n\n👉 Head to Deposit now and claim your bonus before it ends!`,
  },
  {
    id: "weekend-reload",
    label: "Weekend reload",
    emoji: "🔥",
    description: "50% weekend super reload",
    type: "promo",
    promoCode: "WEEKEND50",
    title: "Weekend Super Reload — 50% Bonus!",
    message:
      `🔥 Weekend only at ${SITE}! Reload your wallet and get 50% extra play credits.\n\nCode: WEEKEND50\nValid this weekend only — don't miss out!\n\n👉 Deposit now and start winning.`,
  },
  {
    id: "free-spin-wheel",
    label: "Free spin reminder",
    emoji: "🎡",
    description: "Daily wheel spin reminder",
    type: "promo",
    title: "Your Free Daily Spin Is Ready!",
    message:
      `🎡 You have a FREE spin waiting on the ${SITE} Daily Wheel!\n\nSpin now for bonus credits, free play, and VIP points — resets every 24 hours.\n\n👉 Open the Spin page and claim yours before midnight!`,
  },
  {
    id: "juwa-freeplay",
    label: "Juwa freeplay",
    emoji: "🎰",
    description: "$20 Juwa freeplay bonus",
    type: "promo",
    promoCode: "JUWA20",
    title: "Juwa 777 — $20 Freeplay Bonus!",
    message:
      `🎰 Juwa players — claim $20 freeplay today at ${SITE}!\n\nUse code JUWA20 when you deposit. Instant game account setup, fast loads.\n\n👉 Create or load your Juwa account now!`,
  },
  {
    id: "orion-bonus",
    label: "Orion Stars bonus",
    emoji: "⭐",
    description: "$50 Orion Stars offer",
    type: "promo",
    promoCode: "ORION50",
    title: "Orion Stars — $50 Bonus Offer!",
    message:
      `⭐ Orion Stars special at ${SITE}! Deposit with code ORION50 and get $50 bonus credits.\n\nFish tables, slots & more — load in minutes.\n\n👉 Open Orion Stars and claim your bonus today!`,
  },
  {
    id: "game-vault-vip",
    label: "Game Vault VIP",
    emoji: "👑",
    description: "VIP match for Game Vault",
    type: "promo",
    promoCode: "VAULTVIP",
    title: "Game Vault VIP — 100% Match!",
    message:
      `👑 Game Vault VIP offer at ${SITE}! Use code VAULTVIP for a 100% deposit match.\n\nPremium slots, instant loads, 24/7 support.\n\n👉 Load Game Vault now and play like a VIP!`,
  },
  {
    id: "new-player-welcome",
    label: "Welcome bonus",
    emoji: "🎁",
    description: "Welcome offer for all players",
    type: "success",
    title: "Welcome Bonus — Start With Extra Credits!",
    message:
      `🎁 Welcome to ${SITE}! New and returning players get a special welcome bonus on their first deposit this week.\n\nFast account setup for all 14+ games. Cash App, Zelle & USDT accepted.\n\n👉 Deposit now and we'll load your game instantly!`,
  },
  {
    id: "cashout-fast",
    label: "Fast cashout promo",
    emoji: "⚡",
    description: "Highlight fast redeems",
    type: "info",
    title: "Fast Cashouts — Redeem in Minutes!",
    message:
      `⚡ ${SITE} redeems are processed fast — most cashouts complete within 15–30 minutes during business hours.\n\nLoad any game, play, and redeem back to your wallet anytime.\n\n👉 Questions? Message us in Support chat — we're online 24/7!`,
  },
  {
    id: "referral-bonus",
    label: "Refer a friend",
    emoji: "🤝",
    description: "Referral rewards reminder",
    type: "promo",
    title: "Refer Friends — Earn VIP Points!",
    message:
      `🤝 Invite friends to ${SITE} and earn VIP points for every successful referral!\n\nShare your link from the Dashboard → Referrals. More referrals = higher VIP tier = bigger perks.\n\n👉 Share your link today and climb the VIP ladder!`,
  },
  {
    id: "maintenance",
    label: "Maintenance",
    emoji: "🛠️",
    description: "Site maintenance notice",
    type: "warning",
    title: "Site under maintenance",
    message:
      `${SITE} is currently under maintenance. Loads, redeems, new accounts, and deposits may be delayed until service resumes.\n\nThank you for your patience — we'll notify you when everything is back online.`,
  },
];

export function getPromoBroadcastTemplate(id: string): PromoBroadcastTemplate | undefined {
  return PROMO_BROADCAST_TEMPLATES.find((t) => t.id === id);
}
