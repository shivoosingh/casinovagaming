import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { linkCodeStatus, type TelegramBotPurpose } from "@/lib/telegram/link-codes";

export type { TelegramBotPurpose };

const WHERE_TO_GET_A_CODE: Record<TelegramBotPurpose, string> = {
  admin: "the admin Telegram page (Admin → Telegram Bot)",
  player: "your account's Security page",
};

/** Redeems a one-time /start code, linking a Telegram identity to a Casinova user. */
export async function consumeLinkCode(params: {
  purpose: TelegramBotPurpose;
  code: string;
  telegramUserId: number;
  chatId: number;
  telegramUsername?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const db = createAdminClient();
  if (!db) return { ok: false, error: "Linking is not available right now." };

  const { data: row } = await db
    .from("telegram_link_codes")
    .select("user_id, purpose, expires_at, consumed_at")
    .eq("code", params.code)
    .maybeSingle();

  if (linkCodeStatus(row, params.purpose, new Date()) !== "ok" || !row) {
    return {
      ok: false,
      error: `That link expired or is invalid. Generate a new one from ${WHERE_TO_GET_A_CODE[params.purpose]}.`,
    };
  }

  const { error: upsertError } = await db.from("telegram_links").upsert(
    {
      purpose: params.purpose,
      telegram_user_id: params.telegramUserId,
      chat_id: params.chatId,
      telegram_username: params.telegramUsername ?? null,
      user_id: row.user_id,
      linked_at: new Date().toISOString(),
    },
    { onConflict: "purpose,telegram_user_id" }
  );
  if (upsertError) return { ok: false, error: "Could not complete linking. Try again." };

  await db
    .from("telegram_link_codes")
    .update({ consumed_at: new Date().toISOString() })
    .eq("code", params.code);

  return { ok: true };
}

/** Resolves a linked Telegram user id to the Casinova user id, or null if unlinked. */
export async function findLinkedUser(
  purpose: TelegramBotPurpose,
  telegramUserId: number
): Promise<string | null> {
  const db = createAdminClient();
  if (!db) return null;
  const { data } = await db
    .from("telegram_links")
    .select("user_id")
    .eq("purpose", purpose)
    .eq("telegram_user_id", telegramUserId)
    .maybeSingle();
  return data?.user_id ?? null;
}
