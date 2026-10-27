"use client";

import { Send } from "lucide-react";

import { LinkTelegramButton } from "@/components/shared/link-telegram-button";

/**
 * Player-facing card: link the account to the Casinova customer bot so
 * /wallet, /loads, /ticket and friends work in Telegram. Hidden entirely
 * when the bot is not configured (no username to link to).
 */
export function TelegramLinkCard({ botUsername }: { botUsername: string | null }) {
  if (!botUsername) return null;
  const handle = botUsername.replace(/^@/, "");

  return (
    <section className="rounded-2xl border border-white/10 bg-[#0d0d1f] p-6">
      <h2 className="flex items-center gap-2 font-semibold text-white">
        <Send className="h-4 w-4 text-sky-400" aria-hidden /> Telegram
      </h2>
      <p className="mt-2 text-sm text-[#6b6d8f]">
        Link your account to <span className="text-white">@{handle}</span> to check your wallet, game accounts, loads and
        tickets from Telegram. Send <span className="font-mono text-white">/help</span> to the bot once linked.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <LinkTelegramButton purpose="player" />
        <a
          href={`https://t.me/${handle}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-sky-400 underline-offset-4 hover:underline"
        >
          Open @{handle}
        </a>
      </div>
    </section>
  );
}
