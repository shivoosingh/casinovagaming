"use client";

import { useEffect, useState } from "react";
import { track } from "@vercel/analytics";
import { Gift, X } from "lucide-react";
import { BONUS_HEADLINE, BONUS_SUBTEXT, registerHref } from "@/lib/offers";

const DISMISS_KEY = "cvg_scroll_prompt_dismissed";

/**
 * A single, dismissible signup prompt that slides in once the reader has
 * scrolled ~60% of the page — they're engaged, so the offer is welcome rather
 * than interruptive. Deliberately NOT an exit-intent or page-blocking modal:
 * it never traps the reader, remembers dismissal, and shows at most once.
 */
export function ScrollSignupPrompt({ source }: { source: string }) {
  const [state, setState] = useState<"hidden" | "shown" | "closed">("hidden");

  useEffect(() => {
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      dismissed = false;
    }
    if (dismissed) return;

    const onScroll = () => {
      const scrolled = window.scrollY + window.innerHeight;
      const ratio = scrolled / document.documentElement.scrollHeight;
      if (ratio >= 0.6) {
        setState("shown");
        track("scroll_prompt_shown", { source });
        window.removeEventListener("scroll", onScroll);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [source]);

  if (state !== "shown") return null;

  const close = () => {
    setState("closed");
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignore
    }
  };

  return (
    <div className="fixed bottom-4 left-1/2 z-40 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-2xl border border-violet-500/30 bg-[#140c28]/95 p-4 shadow-[0_8px_40px_rgba(0,0,0,0.5)] backdrop-blur sm:bottom-6 sm:left-auto sm:right-6 sm:translate-x-0">
      <button
        type="button"
        onClick={close}
        aria-label="Dismiss"
        className="absolute right-2 top-2 rounded-full p-1.5 text-violet-300/70 hover:text-violet-100"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-3 pr-4">
        <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-fuchsia-600 text-white">
          <Gift className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-black text-white">{BONUS_HEADLINE}</p>
          <p className="mt-1 text-xs text-violet-200/80">{BONUS_SUBTEXT}</p>
          <a
            href={registerHref(source)}
            onClick={() => {
              try {
                track("scroll_prompt_click", { source });
              } catch {
                // ignore
              }
            }}
            className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-orange-500 via-fuchsia-500 to-violet-600 px-5 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-white"
          >
            Claim it
          </a>
        </div>
      </div>
    </div>
  );
}
