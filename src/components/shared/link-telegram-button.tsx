"use client";

import * as React from "react";
import { ExternalLink, Loader2, Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { generateTelegramLinkCode } from "@/lib/actions/telegram";
import type { TelegramBotPurpose } from "@/lib/telegram/link-codes";

/**
 * Mints a one-time Telegram deep link for the caller's account and lets them
 * open it. `admin` links the staff command bot, `player` the customer bot.
 */
export function LinkTelegramButton({ purpose }: { purpose: TelegramBotPurpose }) {
  const [pending, startTransition] = React.useTransition();
  const [link, setLink] = React.useState<{ deepLink: string; expiresInMinutes: number } | null>(null);

  function generate() {
    startTransition(async () => {
      const res = await generateTelegramLinkCode(purpose);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setLink(res);
    });
  }

  if (link) {
    return (
      <div className="flex flex-col items-start gap-2">
        <Button asChild size="sm">
          <a href={link.deepLink} target="_blank" rel="noopener noreferrer">
            Open in Telegram
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </a>
        </Button>
        <p className="text-xs text-muted-foreground">
          Link expires in {link.expiresInMinutes} minutes and works once. Tap it, then press Start in Telegram.
        </p>
      </div>
    );
  }

  return (
    <Button variant="outline" size="sm" onClick={generate} disabled={pending}>
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Send className="h-3.5 w-3.5" aria-hidden />}
      Link Telegram
    </Button>
  );
}
