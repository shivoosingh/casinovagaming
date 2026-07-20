"use client";

import * as React from "react";

import { AdminSidebar, type AdminNavItem } from "@/components/admin/admin-sidebar";
import { AdminTopbar } from "@/components/admin/admin-topbar";
import { AnimatedLogo } from "@/components/ui/animated-logo";
import { Badge } from "@/components/ui/badge";
import { getAdminSidebarBadgesAction } from "@/lib/actions/admin/badges";

export function AdminChrome({
  items,
  email,
  topRole,
  loadBadges,
  children,
}: {
  items: AdminNavItem[];
  email: string | null;
  topRole: string;
  loadBadges: boolean;
  children: React.ReactNode;
}) {
  const [badges, setBadges] = React.useState<Record<string, number>>({});

  React.useEffect(() => {
    if (!loadBadges) return;
    let cancelled = false;
    void getAdminSidebarBadgesAction().then((result) => {
      if (!cancelled && result.ok) setBadges(result.badges);
    });
    return () => {
      cancelled = true;
    };
  }, [loadBadges]);

  return (
    <div className="relative flex min-h-dvh bg-[#09090F] text-[#F5F3FF]">
      <a
        href="#admin-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-violet-600 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold"
      >
        Skip to content
      </a>

      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-violet-500/20 bg-[rgba(12,10,22,0.92)] backdrop-blur-xl lg:flex xl:w-72">
        <div className="flex items-center gap-2 border-b border-violet-500/20 px-4 py-4">
          <AnimatedLogo textClassName="text-sm" imageSize={28} href="/admin" />
          <Badge variant="purple">Admin</Badge>
        </div>
        <AdminSidebar items={items} badges={badges} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopbar items={items} email={email} topRole={topRole} badges={badges} />
        <main
          id="admin-content"
          className="flex-1 px-3 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-6 lg:px-8"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
