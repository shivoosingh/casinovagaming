import { NextRequest, NextResponse } from "next/server";

import { handleAdminUpdate } from "@/lib/telegram/admin-bot";
import type { TelegramUpdate } from "@/lib/telegram/types";
import { webhookAccepts } from "@/lib/telegram/verify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Telegram webhook for the admin command bot. Register it once with
 * setWebhook + secret_token (docs/telegram-bots.md). Always answers 200:
 * Telegram disables a webhook that keeps returning non-2xx, and an
 * unverified delivery simply does nothing.
 */
export async function POST(request: NextRequest) {
  const provided = request.headers.get("x-telegram-bot-api-secret-token");
  if (!webhookAccepts(provided, process.env.TELEGRAM_ADMIN_WEBHOOK_SECRET?.trim())) {
    return NextResponse.json({ ok: true });
  }

  let update: TelegramUpdate;
  try {
    update = (await request.json()) as TelegramUpdate;
  } catch {
    return NextResponse.json({ ok: true });
  }

  await handleAdminUpdate(update);
  return NextResponse.json({ ok: true });
}
