"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

import { AdminUserSidebarPanel } from "@/components/admin/admin-user-sidebar-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VIP_TIERS } from "@/lib/constants";
import { cn } from "@/lib/utils";

export interface AdminUserRow {
  id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  whatsapp: string | null;
  role: string;
  is_suspended: boolean;
  vip_tier: string;
  vip_points: number;
  wallet_balance: number | null;
  bonus_wallet: number | null;
  cashout_wallet: number | null;
  bonus_redeem_wallet: number | null;
  created_at: string;
  last_seen_at: string | null;
  deposits?: { fulfilledCount: number; totalDeposited: number } | null;
}

interface AdminUsersListProps {
  users: AdminUserRow[];
}

const PAGE_SIZE = 30;

const CARD =
  "overflow-hidden rounded-2xl border border-violet-400/25 bg-[rgba(18,14,34,0.72)] backdrop-blur-xl";

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

export function AdminUsersList({ users }: AdminUsersListProps) {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  useEffect(() => {
    const userId = searchParams.get("userId");
    if (userId && users.some((user) => user.id === userId)) {
      setSelectedUserId(userId);
    }
  }, [searchParams, users]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (user) =>
        user.full_name?.toLowerCase().includes(q) ||
        user.email.toLowerCase().includes(q) ||
        user.phone?.toLowerCase().includes(q) ||
        user.whatsapp?.toLowerCase().includes(q)
    );
  }, [users, query]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;
  const selectedUser = users.find((user) => user.id === selectedUserId) ?? null;

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setVisibleCount(PAGE_SIZE);
          }}
          placeholder="Search users by name, email, or phone..."
          className="border-violet-400/20 bg-[rgba(18,14,34,0.5)] pl-9"
        />
      </div>

      <p className="text-sm text-slate-400">
        {filtered.length} user{filtered.length === 1 ? "" : "s"}
        {query.trim() ? " found" : " total"}
        {filtered.length > PAGE_SIZE && !query.trim() ? " · showing newest first" : ""}
      </p>

      <div className={CARD}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-violet-500/20 text-[11px] uppercase tracking-wider text-violet-300/70">
              <tr>
                <th className="px-4 py-3 font-bold">Player</th>
                <th className="px-4 py-3 font-bold">VIP</th>
                <th className="px-4 py-3 text-right font-bold">Wallet</th>
                <th className="px-4 py-3 text-right font-bold">Deposits</th>
                <th className="px-4 py-3 font-bold">Contact</th>
                <th className="px-4 py-3 font-bold">Last seen</th>
                <th className="px-4 py-3 text-right font-bold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                    No users match your search.
                  </td>
                </tr>
              ) : (
                visible.map((user) => (
                  <tr
                    key={user.id}
                    className={cn(
                      "border-b border-white/[0.04] transition-colors",
                      selectedUserId === user.id && "bg-violet-500/10"
                    )}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-white">
                        {user.full_name || "Unnamed"}
                        {user.is_suspended && (
                          <Badge className="ml-2 bg-red-500/20 text-xs text-red-300">Suspended</Badge>
                        )}
                      </p>
                      <p className="text-xs text-slate-500">Joined {relativeTime(user.created_at)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className="bg-violet-500/15 capitalize text-violet-200">
                        {tierLabel(user.vip_tier)}
                      </Badge>
                      <p className="mt-1 text-xs text-slate-500">{user.vip_points} pts</p>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-300">
                      ${Number(user.wallet_balance ?? 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {user.deposits && user.deposits.fulfilledCount > 0 ? (
                        <>
                          <p className="font-semibold text-emerald-300">
                            ${user.deposits.totalDeposited.toLocaleString()}
                          </p>
                          <p className="text-xs text-slate-500">
                            {user.deposits.fulfilledCount}{" "}
                            {user.deposits.fulfilledCount === 1 ? "deposit" : "deposits"}
                          </p>
                        </>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="max-w-[160px] truncate text-xs text-slate-400">{user.email}</p>
                      {(user.phone || user.whatsapp) && (
                        <p className="text-xs text-slate-500">
                          {[user.phone, user.whatsapp].filter(Boolean).join(" · ")}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {user.last_seen_at ? relativeTime(user.last_seen_at) : "Never"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="border-cyan-400/40 text-cyan-300 hover:bg-cyan-400/10 hover:text-cyan-200"
                        onClick={() => setSelectedUserId(user.id)}
                      >
                        Users
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {hasMore && (
        <div className="flex justify-center pt-2">
          <Button variant="outline" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}>
            Load more users ({filtered.length - visibleCount} remaining)
          </Button>
        </div>
      )}

      {selectedUser && (
        <AdminUserSidebarPanel
          user={selectedUser}
          open={!!selectedUserId}
          onClose={() => setSelectedUserId(null)}
        />
      )}
    </div>
  );
}
