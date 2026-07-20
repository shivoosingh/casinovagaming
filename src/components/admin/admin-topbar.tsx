"use client";

import * as React from "react";
import Link from "next/link";
import { ExternalLink, Menu, X } from "lucide-react";

import { AdminSidebar, type AdminNavItem } from "@/components/admin/admin-sidebar";
import { AnimatedLogo } from "@/components/ui/animated-logo";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AdminTopbar({
  items,
  email,
  topRole,
  badges = {},
}: {
  items: AdminNavItem[];
  email: string | null;
  topRole: string;
  badges?: Record<string, number>;
}) {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-20 border-b border-violet-500/20 bg-[#09090F]/90 backdrop-blur-xl">
      <div className="flex h-14 items-center gap-3 px-3 sm:h-16 sm:px-6">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="lg:hidden text-violet-200"
          aria-label="Open admin menu"
          onClick={() => setOpen(true)}
        >
          <Menu className="size-5" />
        </Button>

        <div className="flex items-center gap-2 lg:hidden">
          <AnimatedLogo textClassName="text-sm" imageSize={24} />
          <Badge variant="purple">Admin</Badge>
        </div>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <div className="hidden text-right sm:block">
            <p className="max-w-[180px] truncate text-sm font-medium text-white">{email}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-violet-300/70">{topRole}</p>
          </div>
          <Button asChild variant="ghost" size="icon" title="Visit website">
            <Link href="/" aria-label="Visit website">
              <ExternalLink className="size-4 text-violet-200" />
            </Link>
          </Button>
          <Avatar className="size-9 border border-violet-400/30">
            <AvatarFallback className="bg-violet-500/20 text-xs font-bold text-violet-100">
              {email?.slice(0, 2).toUpperCase() ?? "CN"}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/70 lg:hidden"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <aside
            className={cn(
              "fixed left-0 top-0 z-50 flex h-dvh w-[min(18rem,88vw)] flex-col border-r border-violet-500/25 bg-[#0c0a14] lg:hidden"
            )}
          >
            <div className="flex items-center justify-between border-b border-violet-500/20 px-4 py-3">
              <div className="flex items-center gap-2">
                <AnimatedLogo textClassName="text-sm" imageSize={24} />
                <Badge variant="purple">Admin</Badge>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
              >
                <X className="size-5" />
              </Button>
            </div>
            <AdminSidebar items={items} onNavigate={() => setOpen(false)} badges={badges} />
          </aside>
        </>
      )}
    </header>
  );
}
