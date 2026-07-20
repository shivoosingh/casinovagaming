"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, LogOut } from "lucide-react";

import { AdminIcon } from "@/components/admin/admin-icon";
import { logoutUser } from "@/lib/auth/logout";
import { cn } from "@/lib/utils";

export type AdminNavItem = {
  href: string;
  label: string;
  icon: string;
  group: string;
};

export function AdminSidebar({
  items,
  onNavigate,
  badges = {},
}: {
  items: AdminNavItem[];
  onNavigate?: () => void;
  badges?: Record<string, number>;
}) {
  const pathname = usePathname();
  const [signingOut, setSigningOut] = React.useState(false);

  const groups = React.useMemo(() => {
    const map = new Map<string, AdminNavItem[]>();
    for (const item of items) {
      const arr = map.get(item.group) ?? [];
      arr.push(item);
      map.set(item.group, arr);
    }
    return [...map.entries()];
  }, [items]);

  async function onSignOut() {
    setSigningOut(true);
    await logoutUser("/");
  }

  return (
    <div className="flex h-full flex-col">
      <nav aria-label="Admin" className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {groups.map(([group, groupItems]) => (
          <div key={group}>
            <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-violet-300/55">
              {group}
            </p>
            <ul className="space-y-0.5">
              {groupItems.map((item) => {
                const active =
                  item.href === "/admin"
                    ? pathname === "/admin"
                    : pathname.startsWith(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      prefetch
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-all",
                        active
                          ? "bg-gradient-to-r from-violet-600/90 to-fuchsia-600/80 text-white shadow-[0_0_20px_rgba(168,85,247,0.35)]"
                          : "text-slate-400 hover:bg-white/[0.04] hover:text-violet-100"
                      )}
                    >
                      <AdminIcon name={item.icon} className="size-4 shrink-0" />
                      <span className="flex-1">{item.label}</span>
                      {badges[item.href] ? (
                        <span className="ml-auto flex min-w-5 items-center justify-center rounded-full bg-fuchsia-500 px-1.5 text-[11px] font-bold leading-5 text-white">
                          {badges[item.href] > 99 ? "99+" : badges[item.href]}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="space-y-1 border-t border-violet-500/20 p-3">
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className="flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium text-slate-400 transition-colors hover:bg-white/[0.04] hover:text-white"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Exit to dashboard
        </Link>
        <button
          type="button"
          disabled={signingOut}
          onClick={() => void onSignOut()}
          className="flex min-h-10 w-full cursor-pointer items-center gap-3 rounded-xl px-3 text-sm font-medium text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-300 disabled:opacity-60"
        >
          <LogOut className="size-4" aria-hidden />
          {signingOut ? "Signing out…" : "Sign Out"}
        </button>
      </div>
    </div>
  );
}
