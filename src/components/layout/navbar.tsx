"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, Search, X, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatedLogo } from "@/components/ui/animated-logo";
import { createClient } from "@/lib/supabase/client";

const NotificationDropdown = dynamic(
  () =>
    import("@/components/notifications/notification-dropdown").then(
      (m) => m.NotificationDropdown
    ),
  { ssr: false, loading: () => null }
);

const UserAccountMenu = dynamic(
  () => import("@/components/layout/user-account-menu").then((m) => m.UserAccountMenu),
  {
    ssr: false,
    loading: () => (
      <div className="hidden h-9 w-9 rounded-full border border-violet-500/20 bg-violet-500/10 sm:block" aria-hidden />
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

type NavbarProps = {
  onMenuClick?: () => void;
  onSearchClick?: () => void;
};

export function Navbar({ onMenuClick, onSearchClick }: NavbarProps = {}) {
  const [open, setOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session?.user);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, session) => {
      setIsLoggedIn(!!session?.user);
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-violet-500/20 bg-[#09090F]/90 backdrop-blur-xl">
      <div className="h-px bg-gradient-to-r from-transparent via-fuchsia-400/70 to-transparent" />

      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-2">
          {onMenuClick && (
            <button
              type="button"
              onClick={onMenuClick}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-violet-400/30 bg-violet-500/10 text-fuchsia-300 lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}
          <AnimatedLogo textClassName="text-lg" />
        </div>

        <div className="hidden items-center gap-6 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group relative text-sm font-medium text-slate-400 transition-colors hover:text-fuchsia-300"
            >
              {link.label}
              <span className="absolute -bottom-0.5 left-0 right-0 h-px origin-left scale-x-0 bg-fuchsia-400 transition-transform group-hover:scale-x-100" />
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-2 md:flex">
          {onSearchClick && (
            <button
              type="button"
              onClick={onSearchClick}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-violet-400/30 bg-violet-500/10 text-fuchsia-300"
              aria-label="Search games"
            >
              <Search className="h-4 w-4" />
            </button>
          )}
          {isLoggedIn ? (
            <>
              <NotificationDropdown buttonClassName="w-9 h-9" />
              <Button size="sm" asChild>
                <Link href="/dashboard/deposit">Deposit</Link>
              </Button>
              <UserAccountMenu compact />
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">Login</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/register" className="inline-flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5" />
                  Get Started
                </Link>
              </Button>
            </>
          )}
        </div>

        <button
          type="button"
          className="rounded-lg border border-violet-400/30 p-2 text-fuchsia-300 transition-colors hover:bg-violet-500/10 md:hidden"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-violet-500/15 bg-[#0c0a14]/95 backdrop-blur-xl md:hidden"
          >
            <div className="flex flex-col gap-1 p-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-lg px-4 py-3 text-sm font-medium text-slate-400 transition-colors hover:bg-violet-500/10 hover:text-fuchsia-200"
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <div className="mt-1 flex flex-col gap-2 border-t border-violet-500/15 pt-3">
                {isLoggedIn ? (
                  <>
                    <Button size="sm" asChild>
                      <Link href="/dashboard/deposit">Deposit</Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/dashboard">Dashboard</Link>
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/login">Login</Link>
                    </Button>
                    <Button size="sm" asChild>
                      <Link href="/register">
                        <Zap className="h-3.5 w-3.5" />
                        Get Started
                      </Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
