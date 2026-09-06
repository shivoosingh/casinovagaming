"use client";

import Link from "next/link";
import { X, MessageCircle } from "lucide-react";

import { AdminWalletGrant } from "@/components/admin/admin-wallet-grant";
import { UserActions } from "@/components/admin/user-actions";
import { WalletCard } from "@/components/wallet/wallet-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { VIP_TIERS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { AdminUserRow } from "@/components/admin/admin-users-list";

function tierLabel(tierId: string) {
  return VIP_TIERS.find((t) => t.id === tierId)?.name ?? tierId;
}

function relativeTime(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 14) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

interface AdminUserSidebarPanelProps {
  user: AdminUserRow;
  open: boolean;
  onClose: () => void;
}

export function AdminUserSidebarPanel({ user, open, onClose }: AdminUserSidebarPanelProps) {
  const displayName = user.full_name || user.email;

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px] transition-opacity duration-300",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={onClose}
        aria-hidden={!open}
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-full max-w-md flex-col border-r border-violet-400/25 bg-[#0b0c1b] shadow-2xl transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "-translate-x-full"
        )}
        aria-hidden={!open}
        aria-label={`Manage ${displayName}`}
      >
        <div className="flex items-start justify-between gap-3 border-b border-violet-500/20 px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-violet-300/70">User</p>
            <h2 className="truncate text-lg font-bold text-white">{displayName}</h2>
            <p className="truncate text-sm text-slate-400">{user.email}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="shrink-0 text-slate-400 hover:text-white"
            aria-label="Close panel"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={user.role === "admin" ? "default" : "secondary"}>{user.role}</Badge>
            {user.is_suspended && <Badge variant="destructive">Suspended</Badge>}
            <Badge className="bg-violet-500/15 capitalize text-violet-200">{tierLabel(user.vip_tier)}</Badge>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
              <p className="text-[10px] uppercase tracking-wide text-slate-500">VIP points</p>
              <p className="mt-1 text-lg font-semibold text-white">{user.vip_points} pts</p>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
              <p className="text-[10px] uppercase tracking-wide text-slate-500">Last seen</p>
              <p className="mt-1 text-lg font-semibold text-white">
                {user.last_seen_at ? relativeTime(user.last_seen_at) : "Never"}
              </p>
            </div>
          </div>

          <WalletCard
            walletBalance={Number(user.wallet_balance ?? 0)}
            cashoutWallet={Number(user.cashout_wallet ?? 0)}
            className="w-full"
          />

          <div className="rounded-xl border border-violet-400/20 bg-[rgba(18,14,34,0.72)] p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-violet-300/70">
              Wallet adjustments
            </p>
            <AdminWalletGrant userId={user.id} />
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-violet-300/70">Account actions</p>
            <UserActions userId={user.id} role={user.role} isSuspended={user.is_suspended} />
            <Button asChild variant="outline" size="sm" className="w-full gap-1.5">
              <Link href={`/admin/transactions?userId=${user.id}`}>View transactions</Link>
            </Button>
            {user.role !== "admin" && (
              <Button variant="outline" size="sm" asChild className="w-full gap-1.5">
                <Link href={`/admin/chat?userId=${user.id}`}>
                  <MessageCircle className="h-4 w-4" />
                  Message player
                </Link>
              </Button>
            )}
          </div>

          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-xs text-slate-500">
            <p>Joined {relativeTime(user.created_at)}</p>
            {(user.phone || user.whatsapp) && (
              <p className="mt-1">
                {[user.phone, user.whatsapp].filter(Boolean).join(" · ")}
              </p>
            )}
            {user.deposits && user.deposits.fulfilledCount > 0 && (
              <p className="mt-1 text-emerald-300">
                ${user.deposits.totalDeposited.toLocaleString()} across {user.deposits.fulfilledCount} deposit
                {user.deposits.fulfilledCount === 1 ? "" : "s"}
              </p>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
