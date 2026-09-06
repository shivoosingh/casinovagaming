"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

import { AdminTransactionSidebarPanel } from "@/components/admin/admin-transaction-sidebar-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AdminTransactionRow } from "@/lib/actions/wallet";
import { cn, formatRelativeTime } from "@/lib/utils";

export interface AdminTransactionUser {
  id: string;
  full_name: string | null;
  email: string;
  wallet_balance?: number | null;
  cashout_wallet?: number | null;
  created_at?: string;
  last_seen_at?: string | null;
}

interface AdminUserTransactionHubProps {
  users: AdminTransactionUser[];
  transactions: AdminTransactionRow[];
  live?: boolean;
}

const PAGE_SIZE = 40;

const CARD =
  "overflow-hidden rounded-2xl border border-violet-400/25 bg-[rgba(18,14,34,0.72)] backdrop-blur-xl";

type UserTxStats = {
  count: number;
  lastAt: string | null;
  creditsIn: number;
  loadsOut: number;
};

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

export function AdminUserTransactionHub({ users, transactions, live }: AdminUserTransactionHubProps) {
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

  const txStatsByUser = useMemo(() => {
    const map = new Map<string, UserTxStats>();
    for (const tx of transactions) {
      const userId = tx.user?.id;
      if (!userId) continue;
      const existing = map.get(userId) ?? { count: 0, lastAt: null, creditsIn: 0, loadsOut: 0 };
      existing.count += 1;
      if (!existing.lastAt || tx.created_at > existing.lastAt) {
        existing.lastAt = tx.created_at;
      }
      const amount = Number(tx.amount);
      if (tx.transaction_type === "credit") existing.creditsIn += amount;
      if (tx.transaction_type === "debit") existing.loadsOut += amount;
      map.set(userId, existing);
    }
    return map;
  }, [transactions]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? users.filter(
          (user) =>
            user.full_name?.toLowerCase().includes(q) || user.email.toLowerCase().includes(q)
        )
      : users;

    return [...list].sort((a, b) => {
      const aStats = txStatsByUser.get(a.id);
      const bStats = txStatsByUser.get(b.id);
      const aTime = aStats?.lastAt ?? a.created_at ?? "";
      const bTime = bStats?.lastAt ?? b.created_at ?? "";
      return bTime.localeCompare(aTime);
    });
  }, [users, query, txStatsByUser]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;
  const selectedUser = users.find((user) => user.id === selectedUserId) ?? null;

  const recentActivity = useMemo(() => transactions.slice(0, 8), [transactions]);

  return (
    <div className="space-y-6">
      <div className={CARD}>
        <div className="border-b border-violet-500/20 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-violet-300/70">
            Recent activity (all users)
          </p>
        </div>
        <div className="divide-y divide-white/[0.04]">
          {recentActivity.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-slate-500">No transactions yet.</p>
          ) : (
            recentActivity.map((tx) => (
              <button
                key={tx.id}
                type="button"
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-violet-500/10"
                onClick={() => tx.user?.id && setSelectedUserId(tx.user.id)}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">
                    {tx.user?.full_name || tx.user?.email || "Unknown user"}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {tx.source} · {formatRelativeTime(tx.created_at)}
                  </p>
                </div>
                <span
                  className={cn(
                    "shrink-0 text-sm font-semibold tabular-nums",
                    tx.transaction_type === "debit" ? "text-amber-400" : "text-emerald-400"
                  )}
                >
                  {tx.transaction_type === "debit" ? "−" : "+"}${Number(tx.amount).toFixed(2)}
                </span>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setVisibleCount(PAGE_SIZE);
          }}
          placeholder="Filter players by name or email..."
          className="border-violet-400/20 bg-[rgba(18,14,34,0.5)] pl-9"
        />
      </div>

      <p className="text-sm text-slate-400">
        {filtered.length} player{filtered.length === 1 ? "" : "s"} · sorted by most recent activity
      </p>

      <div className={CARD}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-violet-500/20 text-[11px] uppercase tracking-wider text-violet-300/70">
              <tr>
                <th className="px-4 py-3 font-bold">Player</th>
                <th className="px-4 py-3 text-right font-bold">Wallet</th>
                <th className="px-4 py-3 text-right font-bold">Transactions</th>
                <th className="px-4 py-3 font-bold">Last activity</th>
                <th className="px-4 py-3 text-right font-bold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                    No players match your filter.
                  </td>
                </tr>
              ) : (
                visible.map((user) => {
                  const stats = txStatsByUser.get(user.id);
                  return (
                    <tr
                      key={user.id}
                      className={cn(
                        "border-b border-white/[0.04] transition-colors",
                        selectedUserId === user.id && "bg-violet-500/10"
                      )}
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-white">{user.full_name || "Unnamed"}</p>
                        <p className="max-w-[200px] truncate text-xs text-slate-500">{user.email}</p>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-emerald-300">
                        ${Number(user.wallet_balance ?? 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <p className="font-semibold text-white">{stats?.count ?? 0}</p>
                        {(stats?.creditsIn ?? 0) > 0 && (
                          <p className="text-xs text-emerald-400">
                            +${stats!.creditsIn.toFixed(0)} in
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">
                        {stats?.lastAt
                          ? relativeTime(stats.lastAt)
                          : user.last_seen_at
                            ? relativeTime(user.last_seen_at)
                            : "No activity"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="border-cyan-400/40 text-cyan-300 hover:bg-cyan-400/10 hover:text-cyan-200"
                          onClick={() => setSelectedUserId(user.id)}
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {hasMore && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}>
            Load more ({filtered.length - visibleCount} remaining)
          </Button>
        </div>
      )}

      {selectedUser && (
        <AdminTransactionSidebarPanel
          user={selectedUser}
          transactions={transactions}
          open={!!selectedUserId}
          live={live}
          onClose={() => setSelectedUserId(null)}
        />
      )}
    </div>
  );
}
