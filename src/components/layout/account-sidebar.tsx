"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import {
  LayoutDashboard,
  MessageSquare,
  Crown,
  Users,
  StarHalf,
  Sparkles,
  Headphones,
  ShieldCheck,
  Gamepad2,
  Banknote,
  History,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUnreadMessages } from "@/hooks/use-unread-messages";
import { UnreadBadge } from "@/components/ui/unread-badge";

const ACCOUNT_LINKS = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/games", label: "My Games", icon: Gamepad2 },
  { href: "/blog", label: "Blog & Guides", icon: Target },
  { href: "/games", label: "All Games", icon: Gamepad2 },
  { href: "/dashboard/deposit", label: "Deposit", icon: Banknote },
  { href: "/dashboard/deposits", label: "My Deposits", icon: History },
  { href: "/dashboard/messages", label: "Messages", icon: MessageSquare },
  { href: "/dashboard/vip", label: "VIP Status", icon: Crown },
  { href: "/dashboard/referrals", label: "Referrals", icon: Users },
  { href: "/dashboard/reviews", label: "Reviews", icon: StarHalf },
  { href: "/spin", label: "Daily Spin", icon: Sparkles },
];

const PREFETCH_ROUTES = ACCOUNT_LINKS.map((link) => link.href).filter(
  (href) => !href.startsWith("/#")
);

interface AccountSidebarProps {
  walletSlot?: React.ReactNode;
  className?: string;
}

export function AccountSidebar({ walletSlot, className }: AccountSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const prefetched = useRef(new Set<string>());
  const { count: unreadMessages } = useUnreadMessages();

  function warmRoute(href: string) {
    if (prefetched.current.has(href) || href.startsWith("/#")) return;
    prefetched.current.add(href);
    router.prefetch(href);
  }

  useEffect(() => {
    for (const href of PREFETCH_ROUTES) warmRoute(href);
  }, [router]);

  return (
    <aside
      className={cn(
        "cx-glass flex flex-col gap-3 rounded-3xl p-3.5",
        "min-h-[calc(100vh-6rem)]",
        className
      )}
    >
      {walletSlot}

      <div className="cx-glass-soft rounded-2xl p-3.5">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-violet-300/70">
          My Account
        </p>
        <nav className="space-y-1">
          {ACCOUNT_LINKS.map(({ href, label, icon: Icon, exact }) => {
            const active = exact
              ? pathname === href
              : pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={`${href}-${label}`}
                href={href}
                prefetch={!href.startsWith("/#")}
                onMouseEnter={() => warmRoute(href)}
                onFocus={() => warmRoute(href)}
                onTouchStart={() => warmRoute(href)}
                className={cn(
                  "relative flex w-full items-center gap-3 overflow-hidden rounded-xl px-3 py-2.5 text-sm transition-all duration-300",
                  active
                    ? "font-semibold text-white shadow-[0_0_24px_rgba(168,85,247,0.4)]"
                    : "text-slate-400 hover:bg-white/[0.04] hover:text-violet-100"
                )}
              >
                {active && (
                  <span className="absolute inset-0 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-violet-500" />
                )}
                <Icon className={cn("relative z-10 h-4 w-4 shrink-0", active ? "text-white" : "text-violet-300/70")} />
                <span className="relative z-10 flex-1">{label}</span>
                {href === "/dashboard/messages" && (
                  <span className="relative z-10">
                    <UnreadBadge count={unreadMessages} />
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto space-y-3 pt-2">
        <div className="cx-glass-soft rounded-2xl p-4">
          <div className="mb-2 flex items-center gap-2">
            <Headphones className="h-4 w-4 text-sky-400" />
            <p className="text-xs font-semibold text-white">24/7 Live Support</p>
          </div>
          <Link
            href="/dashboard/messages"
            prefetch
            onTouchStart={() => warmRoute("/dashboard/messages")}
            className="block rounded-xl border border-violet-400/30 bg-violet-500/15 py-2 text-center text-xs font-semibold text-violet-100 transition-all hover:bg-violet-500/30 hover:shadow-[0_0_18px_rgba(168,85,247,0.3)]"
          >
            Open Messages
          </Link>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.06] px-3 py-2.5">
          <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" />
          <p className="text-[10px] leading-snug text-emerald-300/80">
            Secure accounts · Fast setup · Trusted platform
          </p>
        </div>
      </div>
    </aside>
  );
}
