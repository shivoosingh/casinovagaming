// Env → chat id / bot token resolution for every outbound Telegram send.
// Pure module (no imports, takes `env` as an argument) so the self-check
// script can exercise the fallback rules on plain Node.
//
// Three bots, as in WinSweeps:
//   ops-alert bot   TELEGRAM_BOT_TOKEN          → finance / users / sweepstakes / errors / reports
//   admin bot       TELEGRAM_ADMIN_BOT_TOKEN    → staff commands (webhook, see admin-bot.ts)
//   customer bot    TELEGRAM_CUSTOMER_BOT_TOKEN → player commands + the public promo channel
//
// Casinova fallbacks (the live site ran on one bot + one chat before this):
//   a missing TELEGRAM_CHAT_<X> falls back to TELEGRAM_ADMIN_CHAT_ID, and the
//   promo channel falls back to TELEGRAM_PROMO_CHAT_ID, then the admin chat,
//   and posts through the ops bot when no customer bot token is set.

export type OpsChannel = "finance" | "users" | "sweepstakes" | "errors" | "reports";
export type OutboundChannel = OpsChannel | "admin" | "promo";

export const OPS_CHANNELS: readonly OpsChannel[] = ["finance", "users", "sweepstakes", "errors", "reports"];

type Env = Record<string, string | undefined>;

const OPS_CHANNEL_VARS: Record<OpsChannel, string> = {
  finance: "TELEGRAM_CHAT_FINANCE",
  users: "TELEGRAM_CHAT_USERS",
  sweepstakes: "TELEGRAM_CHAT_SWEEPSTAKES",
  errors: "TELEGRAM_CHAT_ERRORS",
  reports: "TELEGRAM_CHAT_REPORTS",
};

/** Comma-separated ids → trimmed list; private user id, group id (-100…), or several. */
export function splitChatIds(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

function firstConfigured(env: Env, keys: string[]): string[] {
  for (const key of keys) {
    const ids = splitChatIds(env[key]);
    if (ids.length) return ids;
  }
  return [];
}

/** Chat ids a channel posts to, after the single-bot fallbacks. */
export function resolveChatIds(env: Env, channel: OutboundChannel): string[] {
  if (channel === "admin") return firstConfigured(env, ["TELEGRAM_ADMIN_CHAT_ID"]);
  if (channel === "promo") {
    return firstConfigured(env, ["TELEGRAM_CHAT_PROMO", "TELEGRAM_PROMO_CHAT_ID", "TELEGRAM_ADMIN_CHAT_ID"]);
  }
  return firstConfigured(env, [OPS_CHANNEL_VARS[channel], "TELEGRAM_ADMIN_CHAT_ID"]);
}

function token(env: Env, key: string): string | null {
  const value = env[key]?.trim();
  return value ? value : null;
}

/** Bot token that posts to a channel: the customer bot owns promo, the ops bot everything else. */
export function resolveBotToken(env: Env, channel: OutboundChannel): string | null {
  if (channel === "promo") {
    return token(env, "TELEGRAM_CUSTOMER_BOT_TOKEN") ?? token(env, "TELEGRAM_BOT_TOKEN");
  }
  return token(env, "TELEGRAM_BOT_TOKEN");
}

/** The ops-alert bot can deliver staff alerts: a token plus somewhere for them to land. */
export function isOpsConfigured(env: Env): boolean {
  if (!resolveBotToken(env, "finance")) return false;
  return (["admin", "finance", "users", "errors"] as const).some((c) => resolveChatIds(env, c).length > 0);
}

export type CommandBotStatus = { token: boolean; secret: boolean; username: string | null; ready: boolean };

/** Setup state of a command bot, for the admin Telegram page. A bot is ready when its webhook can be verified and a deep link can be built. */
export function commandBotStatus(env: Env, bot: "admin" | "customer"): CommandBotStatus {
  const prefix = bot === "admin" ? "TELEGRAM_ADMIN" : "TELEGRAM_CUSTOMER";
  const hasToken = Boolean(token(env, `${prefix}_BOT_TOKEN`));
  const hasSecret = Boolean(token(env, `${prefix}_WEBHOOK_SECRET`));
  const username = token(env, `${prefix}_BOT_USERNAME`)?.replace(/^@/, "") ?? null;
  return { token: hasToken, secret: hasSecret, username, ready: hasToken && hasSecret && Boolean(username) };
}

/** Promo posts can go out (customer bot or, as a fallback, the ops bot). */
export function isPromoConfigured(env: Env): boolean {
  return Boolean(resolveBotToken(env, "promo")) && resolveChatIds(env, "promo").length > 0;
}
