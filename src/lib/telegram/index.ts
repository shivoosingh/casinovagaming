// Ops-alert bot: one-way, fire-and-forget staff alerts into five fixed
// channels (finance, users, sweepstakes, errors, reports), one chat id env
// var each. Never receives input; the command bots live in admin-bot.ts and
// customer-bot.ts. Env resolution (and the single-chat fallback) is in
// channels.ts.
import { SITE_URL } from "@/lib/constants";
import { resolveBotToken, resolveChatIds, type OpsChannel } from "@/lib/telegram/channels";

export type { OpsChannel };

/** Escape user-supplied strings for Telegram HTML parse_mode. */
export function tgEsc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Clickable site link for Telegram HTML messages. */
export function adminLink(path: string, label: string): string {
  return `<a href="${SITE_URL}${path}">${label}</a>`;
}

/** True when an alert sent to this channel has somewhere to go. */
export function isOpsChannelConfigured(channel: OpsChannel): boolean {
  return Boolean(resolveBotToken(process.env, channel)) && resolveChatIds(process.env, channel).length > 0;
}

/**
 * POSTs to the Telegram API and reports whether Telegram itself accepted the
 * message: it replies 200 with `ok:false` for a bad chat id or a kicked bot,
 * so a plain fetch success does not mean delivery succeeded.
 */
async function tgPost(
  token: string,
  method: string,
  body: BodyInit,
  headers?: Record<string, string>
): Promise<{ ok: boolean; description?: string }> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST",
      headers,
      body,
      cache: "no-store",
    });
    const data = (await res.json().catch(() => null)) as { ok?: boolean; description?: string } | null;
    if (!res.ok || !data?.ok) {
      return { ok: false, description: data?.description ?? `HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, description: err instanceof Error ? err.message : "network error" };
  }
}

async function reportFailure(channel: OpsChannel, what: string, description: string | undefined): Promise<void> {
  console.error(`[telegram] ${what}(${channel}) failed: ${description}`);
  // Mirror into the errors channel so a bad chat id / kicked bot does not fail
  // invisibly; guarded so the errors channel can never recurse into itself.
  if (channel !== "errors") {
    await tgNotify(
      "errors",
      `🚨 <b>Telegram send failed</b> (channel: ${tgEsc(channel)})\n${tgEsc(description ?? "unknown error")}`
    );
  }
}

/**
 * Fire-and-forget Telegram notification. Silent no-op when the env vars are
 * absent. Never throws: always best-effort.
 */
export async function tgNotify(channel: OpsChannel, text: string): Promise<void> {
  const token = resolveBotToken(process.env, channel);
  const chatIds = resolveChatIds(process.env, channel);
  if (!token || !chatIds.length) return;
  for (const chatId of chatIds) {
    const result = await tgPost(
      token,
      "sendMessage",
      JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true }),
      { "Content-Type": "application/json" }
    );
    if (!result.ok) await reportFailure(channel, "tgNotify", result.description);
  }
}

/**
 * Same as tgNotify, but attaches an image (Telegram sendPhoto). The caption
 * takes the same HTML-formatted text tgNotify would have sent.
 */
export async function tgNotifyPhoto(
  channel: OpsChannel,
  caption: string,
  photo: { data: ArrayBuffer; filename: string; contentType: string }
): Promise<void> {
  const token = resolveBotToken(process.env, channel);
  const chatIds = resolveChatIds(process.env, channel);
  if (!token || !chatIds.length) return;
  for (const chatId of chatIds) {
    const form = new FormData();
    form.set("chat_id", chatId);
    form.set("caption", caption);
    form.set("parse_mode", "HTML");
    form.set("photo", new Blob([photo.data], { type: photo.contentType }), photo.filename);
    const result = await tgPost(token, "sendPhoto", form);
    if (!result.ok) await reportFailure(channel, "tgNotifyPhoto", result.description);
  }
}
