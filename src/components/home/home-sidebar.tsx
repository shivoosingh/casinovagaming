"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  LayoutGrid,
  Clock,
  Star,
  Zap,
  Trophy,
  Crown,
  Sparkles,
  Headphones,
  Circle,
} from "lucide-react";
import type { GameTab } from "@/lib/games";
import { cn } from "@/lib/utils";

export const SIDEBAR_LINKS: { id: GameTab; label: string; icon: React.ElementType }[] = [
  { id: "all", label: "All Games", icon: LayoutGrid },
  { id: "upcoming", label: "Upcoming Games", icon: Clock },
  { id: "popular", label: "Popular Games", icon: Star },
  { id: "trending", label: "Trending Games", icon: Zap },
  { id: "topRated", label: "Top Rated Games", icon: Trophy },
];

interface HomeSidebarProps {
  activeTab: GameTab;
  onTabChange: (tab: GameTab) => void;
  onSearchClick: () => void;
  walletSlot?: React.ReactNode;
  className?: string;
}

export function HomeSidebar({
  activeTab,
  onTabChange,
  onSearchClick,
  walletSlot,
  className,
}: HomeSidebarProps) {
  const router = useRouter();
  const prefetched = useRef(new Set<string>());
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  function warm(href: string) {
    if (prefetched.current.has(href)) return;
    prefetched.current.add(href);
    router.prefetch(href);
  }

  useEffect(() => {
    const run = () => {
      import("@/lib/supabase/client").then(({ createClient }) => {
        const sb = createClient();
        if (!sb) return;
        void sb.auth.getSession().then(({ data: { session } }) => {
          setIsLoggedIn(!!session?.user);
        });
      });
    };
    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(run, { timeout: 1200 });
      return () => window.cancelIdleCallback(id);
    }
    const t = setTimeout(run, 300);
    return () => clearTimeout(t);
  }, []);

  return (
    <aside
      className={cn(
        "cx-glass flex h-full min-h-[calc(100vh-6rem)] flex-col gap-3 rounded-3xl p-3.5",
        className
      )}
    >
      <button
        type="button"
        onClick={onSearchClick}
        className="cx-search-pill group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-full py-3 text-sm font-bold text-white transition-transform hover:scale-[1.02] active:scale-[0.98]"
      >
        <span className="absolute inset-0 bg-gradient-to-r from-orange-500 via-fuchsia-500 to-violet-600" />
        <span className="absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100 bg-gradient-to-r from-violet-600 via-fuchsia-500 to-orange-500" />
        <Search className="relative z-10 h-4 w-4" />
        <span className="relative z-10">Search Games</span>
      </button>

      {isLoggedIn && walletSlot && <div>{walletSlot}</div>}

      <div className="cx-glass-soft rounded-2xl p-3">
        <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-[0.2em] text-violet-300/70">
          Explore Games
        </p>
        <nav className="space-y-1">
          {SIDEBAR_LINKS.map(({ id, label, icon: Icon }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onTabChange(id)}
                className={cn(
                  "relative flex w-full items-center gap-3 overflow-hidden rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-all duration-300",
                  active
                    ? "text-white shadow-[0_0_24px_rgba(168,85,247,0.45)]"
                    : "text-slate-400 hover:bg-white/[0.04] hover:text-violet-100"
                )}
              >
                {active && (
                  <span className="absolute inset-0 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-violet-500" />
                )}
                <Icon className={cn("relative z-10 h-4 w-4 shrink-0", active ? "text-white" : "text-violet-300/70")} />
                <span className="relative z-10">{label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="cx-glass-soft relative overflow-hidden rounded-2xl p-4">
        <div
          className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-40 blur-2xl"
          style={{ background: "radial-gradient(circle, #A855F7, transparent)" }}
        />
        <div className="relative z-10 mb-3 flex h-9 w-9 items-center justify-center rounded-xl border border-violet-400/30 bg-violet-500/20">
          <Crown className="h-4 w-4 text-fuchsia-300" />
        </div>
        <p className="relative z-10 mb-1 text-sm font-bold text-white">Unlock Premium Access</p>
        <p className="relative z-10 mb-3 text-[11px] leading-relaxed text-slate-400">
          Experience VIP perks, bigger wins, and exclusive features.
        </p>
        <Link
          href={isLoggedIn ? "/dashboard/vip" : "/login"}
          onMouseEnter={() => warm(isLoggedIn ? "/dashboard/vip" : "/login")}
          className="relative z-10 block w-full rounded-xl border border-violet-400/35 bg-violet-500/20 py-2.5 text-center text-xs font-bold text-violet-100 transition-all hover:bg-violet-500/35 hover:shadow-[0_0_20px_rgba(168,85,247,0.35)]"
        >
          Login & Access All
        </Link>
      </div>

      {!isLoggedIn && (
        <div className="cx-glass-soft rounded-2xl p-4">
          <div className="mb-1 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-orange-400" />
            <p className="text-sm font-bold text-white">New Here?</p>
          </div>
          <p className="mb-3 text-[11px] leading-relaxed text-slate-400">
            Claim your free account & start playing!
          </p>
          <Link
            href="/register"
            onMouseEnter={() => warm("/register")}
            className="block w-full rounded-full bg-gradient-to-r from-orange-500 via-fuchsia-500 to-violet-600 py-2.5 text-center text-xs font-black text-white shadow-[0_8px_24px_rgba(232,121,249,0.35)] transition-transform hover:scale-[1.02]"
          >
            Sign Up
          </Link>
        </div>
      )}

      <div className="cx-glass-soft rounded-2xl p-4">
        <div className="mb-1 flex items-center gap-2">
          <Headphones className="h-4 w-4 text-sky-400" />
          <p className="text-sm font-bold text-white">24/7 Live Support</p>
        </div>
        <p className="mb-3 text-[11px] leading-relaxed text-slate-400">
          Need help? Chat with our team anytime.
        </p>
        <Link
          href="/support"
          onMouseEnter={() => warm("/support")}
          className="block w-full rounded-xl border border-white/10 bg-white/[0.03] py-2.5 text-center text-xs font-bold text-slate-200 transition-colors hover:border-violet-400/40 hover:bg-violet-500/10"
        >
          Contact Support
        </Link>
      </div>

      <div className="mt-auto flex items-center gap-2 px-1 pb-1">
        <Circle className="h-2.5 w-2.5 fill-emerald-400 text-emerald-400 animate-pulse" />
        <p className="text-[11px] font-medium text-slate-500">
          System Status: <span className="text-emerald-400">Online</span>
        </p>
      </div>
    </aside>
  );
}
