// Outbound Telegram sends used by the existing alert helpers, the promo
// rotation and the admin broadcast panel. Which bot token and which chat ids
// a channel uses is decided in channels.ts (ops bot for staff channels, the
// customer bot for the public promo channel, with the single-bot fallbacks).
import {
  isOpsConfigured,
  isPromoConfigured,
  resolveBotToken,
  resolveChatIds,
  splitChatIds,
  type OutboundChannel,
} from "@/lib/telegram/channels";

const TELEGRAM_API = "https://api.telegram.org";

export type TelegramOutboundChannel = OutboundChannel;

type SendOptions = {
  disableNotification?: boolean;
  channel?: TelegramOutboundChannel;
  /** Explicit chat ids (promo-only blog posts); still sent with the channel's bot. */
  chatIds?: string[];
};

/**
 * Blog posts only. Never falls back to a staff chat.
 * Returns promo ids that are not also the admin alert chat.
 */
export function blogBroadcastChatIds(): string[] {
  const raw = process.env.TELEGRAM_CHAT_PROMO?.trim() || process.env.TELEGRAM_PROMO_CHAT_ID?.trim();
  if (!raw) return [];
  const admin = new Set(splitChatIds(process.env.TELEGRAM_ADMIN_CHAT_ID));
  return splitChatIds(raw).filter((id) => !admin.has(id));
}

/** The ops-alert bot can deliver staff alerts. */
export function isTelegramConfigured(): boolean {
  return isOpsConfigured(process.env);
}

/** Promo posts can go out (customer bot, or the ops bot as a fallback). */
export function isTelegramPromoConfigured(): boolean {
  return isPromoConfigured(process.env);
}

/** Escape dynamic text for Telegram HTML parse mode. */
export function escapeTelegramHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function callTelegram(
  token: string,
  method: "sendMessage" | "sendPhoto",
  body: Record<string, unknown>
): Promise<{ ok: boolean; error?: string }> {
  try {
    const response = await fetch(`${TELEGRAM_API}/bot${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const payload = (await response.json().catch(() => null)) as { ok?: boolean; description?: string } | null;

    if (!response.ok || !payload?.ok) {
      return { ok: false, error: payload?.description ?? `HTTP ${response.status}` };
    }

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Telegram request failed",
    };
  }
}

function resolveTarget(options?: SendOptions): { token: string; chatIds: string[] } | { error: string } {
  const channel = options?.channel ?? "admin";
  const token = resolveBotToken(process.env, channel);
  const chatIds = options?.chatIds ?? resolveChatIds(process.env, channel);
  if (!token || chatIds.length === 0) {
    return { error: `Telegram is not configured for the ${channel} channel` };
  }
  return { token, chatIds };
}

function collect(results: { ok: boolean; error?: string }[], fallback: string): { ok: boolean; error?: string } {
  if (results.some((r) => r.ok)) return { ok: true };
  const errors = results.map((r) => r.error).filter(Boolean);
  return { ok: false, error: errors.join("; ") || fallback };
}

export async function sendTelegramPhoto(
  photoUrl: string,
  caption: string,
  options?: SendOptions
): Promise<{ ok: boolean; error?: string }> {
  const target = resolveTarget(options);
  if ("error" in target) return { ok: false, error: target.error };

  const results = await Promise.all(
    target.chatIds.map((chatId) =>
      callTelegram(target.token, "sendPhoto", {
        chat_id: chatId,
        photo: photoUrl,
        caption,
        parse_mode: "HTML",
        disable_notification: options?.disableNotification ?? false,
      })
    )
  );
  return collect(results, "All Telegram photo sends failed");
}

export async function sendTelegramMessage(
  text: string,
  options?: SendOptions
): Promise<{ ok: boolean; error?: string }> {
  const target = resolveTarget(options);
  if ("error" in target) return { ok: false, error: target.error };

  const results = await Promise.all(
    target.chatIds.map((chatId) =>
      callTelegram(target.token, "sendMessage", {
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
        disable_notification: options?.disableNotification ?? false,
      })
    )
  );
  return collect(results, "All Telegram sends failed");
}
