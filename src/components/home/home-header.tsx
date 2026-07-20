"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { Search, Menu } from "lucide-react";
import { AnimatedLogo } from "@/components/ui/animated-logo";
import { createClient } from "@/lib/supabase/client";

const NotificationDropdown = dynamic(
  () => import("@/components/notifications/notification-dropdown").then((m) => m.NotificationDropdown),
  { ssr: false, loading: () => null }
);
const UserAccountMenu = dynamic(
  () => import("@/components/layout/user-account-menu").then((m) => m.UserAccountMenu),
  {
    ssr: false,
    loading: () => (
      <div className="hidden h-9 w-9 rounded-lg border border-violet-500/20 bg-violet-500/10 sm:block" aria-hidden />
    ),
  }
);

const navLinks = [
  { href: "/#games", label: "Games" },
  { href: "/blog", label: "Blog" },
  { href: "/promotions", label: "Promotions" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/vip", label: "VIP" },
  { href: "/support", label: "Support" },
];

interface HomeHeaderProps {
  onSearchClick: () => void;
  onMenuClick?: () => void;
  assumeLoggedIn?: boolean;
}

export function HomeHeader({ onSearchClick, onMenuClick, assumeLoggedIn = false }: HomeHeaderProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(assumeLoggedIn);

  useEffect(() => {
    if (assumeLoggedIn) return;
    const supabase = createClient();
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data: { session } }) => setIsLoggedIn(!!session?.user));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, session) => setIsLoggedIn(!!session?.user));
    return () => subscription.unsubscribe();
  }, [assumeLoggedIn]);

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between gap-2 overflow-visible border-b border-violet-500/20 bg-[#09090F]/88 px-3 py-3 backdrop-blur-xl sm:gap-4 sm:px-6">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-fuchsia-400/70 to-transparent" />

      <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
        {onMenuClick && (
          <button
            type="button"
            onClick={onMenuClick}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-violet-400/30 bg-violet-500/10 text-fuchsia-300 transition-colors hover:bg-violet-500/20 lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        <AnimatedLogo
          textClassName="inline-flex text-xs sm:text-lg"
          imageSize={28}
          className="min-w-0 overflow-hidden [&_img]:sm:h-9 [&_img]:sm:w-9"
        />
      </div>

      <div className="hidden items-center gap-5 lg:flex">
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="text-sm font-medium text-slate-400 transition-colors hover:text-fuchsia-300"
          >
            {link.label}
          </Link>
        ))}
      </div>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <button
          type="button"
          onClick={onSearchClick}
          className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-violet-400/30 bg-violet-500/10 text-fuchsia-300 transition-all hover:bg-violet-500/20 sm:flex"
          aria-label="Search games"
        >
          <Search className="h-5 w-5" />
        </button>

        {isLoggedIn && <NotificationDropdown buttonClassName="w-9 h-9 sm:w-10 sm:h-10" />}

        {isLoggedIn ? (
          <>
            <Link
              href="/dashboard/deposit"
              prefetch={false}
              className="inline-flex shrink-0 whitespace-nowrap rounded-full bg-gradient-to-r from-orange-500 via-fuchsia-500 to-violet-600 px-3 py-1.5 text-[10px] font-bold text-white shadow-[0_0_18px_rgba(232,121,249,0.35)] transition-transform hover:scale-[1.03] sm:px-4 sm:py-2 sm:text-sm"
            >
              Deposit
            </Link>
            <UserAccountMenu compact />
          </>
        ) : (
          <>
            <Link
              href="/login"
              className="inline shrink-0 whitespace-nowrap px-1.5 text-xs font-medium text-slate-400 transition-colors hover:text-fuchsia-300 sm:px-2 sm:text-sm"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="shrink-0 whitespace-nowrap rounded-full bg-gradient-to-r from-orange-500 via-fuchsia-500 to-violet-600 px-3 py-2 text-xs font-bold text-white shadow-[0_0_18px_rgba(232,121,249,0.35)] transition-transform hover:scale-[1.03] sm:px-4 sm:text-sm"
            >
              Sign Up
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
