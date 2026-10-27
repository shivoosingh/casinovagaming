"use server";

import { getStaffContext } from "@/lib/data/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  LINK_CODE_TTL_MINUTES,
  deepLinkFor,
  newLinkCode,
  type TelegramBotPurpose,
} from "@/lib/telegram/link-codes";

export type TelegramLinkResult =
  | { ok: true; deepLink: string; expiresInMinutes: number }
  | { ok: false; error: string };

/**
 * Mint a one-time deep-link code tying the caller's Casinova account to a
 * Telegram bot. Staff link the admin bot; any signed-in player links the
 * customer bot. The bot's /start handler redeems it (linking.ts).
 */
export async function generateTelegramLinkCode(purpose: TelegramBotPurpose): Promise<TelegramLinkResult> {
  let userId: string;

  if (purpose === "admin") {
    const ctx = await getStaffContext();
    if (!ctx) return { ok: false, error: "You don't have permission to do that." };
    userId = ctx.userId;
  } else {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Please sign in again." };
    userId = user.id;
  }

  const botUsername =
    purpose === "admin"
      ? process.env.TELEGRAM_ADMIN_BOT_USERNAME?.trim()
      : process.env.TELEGRAM_CUSTOMER_BOT_USERNAME?.trim();
  if (!botUsername) {
    return { ok: false, error: "The Telegram bot isn't configured yet." };
  }

  const db = createAdminClient();
  if (!db) return { ok: false, error: "Linking is not available right now." };

  const code = newLinkCode(crypto.randomUUID());
  const { error } = await db.from("telegram_link_codes").insert({
    code,
    purpose,
    user_id: userId,
    expires_at: new Date(Date.now() + LINK_CODE_TTL_MINUTES * 60_000).toISOString(),
  });
  if (error) return { ok: false, error: "Could not generate a link code. Try again." };

  return {
    ok: true,
    deepLink: deepLinkFor(botUsername, code),
    expiresInMinutes: LINK_CODE_TTL_MINUTES,
  };
}
