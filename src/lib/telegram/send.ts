import "server-only";

/**
 * Reply to a specific chat from a specific bot. Distinct from the
 * fixed-channel `tgNotify`: the command bots answer whoever wrote to them.
 */
export async function tgReply(botToken: string, chatId: number, text: string): Promise<void> {
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true }),
      cache: "no-store",
    });
  } catch {
    // best-effort: never throw out of a webhook handler
  }
}

/**
 * Post a text or image promo to a chat from a specific bot (the customer bot
 * posting into the public promo group). `imageUrl` is handed straight to
 * Telegram's sendPhoto, which fetches it server-side.
 */
export async function tgBroadcast(
  botToken: string,
  chatId: string,
  text: string,
  imageUrl?: string
): Promise<void> {
  try {
    const method = imageUrl ? "sendPhoto" : "sendMessage";
    const body = imageUrl
      ? { chat_id: chatId, photo: imageUrl, caption: text, parse_mode: "HTML" }
      : { chat_id: chatId, text, parse_mode: "HTML" };
    await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    // best-effort: never block the caller
  }
}
