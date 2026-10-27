import { NextRequest, NextResponse } from "next/server";

import { tgEsc, tgNotify } from "@/lib/telegram";
import { runTelegramPromoBroadcast } from "@/lib/telegram/promo-broadcast";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Externally scheduled (cron-job.org / Vercel cron): rotates through the
 * telegram_promo_messages pool and posts the next one through the customer
 * bot into the promo channel. A thrown error lands in the errors channel.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  const auth = request.headers.get("authorization");

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runTelegramPromoBroadcast();
    const status = result.ok ? 200 : 500;
    return NextResponse.json(result, { status });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    await tgNotify("errors", `🚨 <b>Telegram promo cron failed</b>\n${tgEsc(msg)}`);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
