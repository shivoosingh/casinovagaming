"use client";

import { useEffect, useState } from "react";
import { track } from "@vercel/analytics";
import { Gift, X } from "lucide-react";
import { BONUS_HEADLINE_SHORT, registerHref } from "@/lib/offers";

const DISMISS_KEY = "cvg_signup_bar_dismissed";

/**
 * Mobile-only sticky signup bar. Dismissible; the dismissal is remembered
 * per-browser via localStorage (wrapped in try/catch so it degrades to
 * always-shown if storage is unavailable). Hidden on sm+ where the navbar
 * CTA already covers signup.
 */
export function SignupStickyBar({ source }: { source: string }) {
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    try {
      setHidden(localStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      setHidden(false);
    }
  }, []);

  if (hidden) return null;

  const dismiss = () => {
    setHidden(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignore: dismissal just won't persist
    }
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-violet-500/30 bg-[#0b0718]/95 px-3 py-2.5 backdrop-blur sm:hidden">
      <div className="flex items-center gap-2.5">
        <Gift className="h-5 w-5 shrink-0 text-orange-300" />
        <span className="min-w-0 flex-1 truncate text-xs font-semibold text-violet-100">
          {BONUS_HEADLINE_SHORT}
        </span>
        <a
          href={registerHref(source)}
          onClick={() => {
            try {
              track("cta_click", { source, variant: "sticky" });
            } catch {
              // analytics must never block navigation
            }
          }}
          className="shrink-0 rounded-full bg-gradient-to-r from-orange-500 via-fuchsia-500 to-violet-600 px-4 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-white"
        >
          Sign up
        </a>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="shrink-0 rounded-full p-1.5 text-violet-300/70 hover:text-violet-100"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
