"use client";

import { useCallback, useState, useTransition } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

import { fetchCrmPlayersAction } from "@/lib/actions/admin/crm";
import type { CrmPlayersPage, CrmSegment } from "@/lib/data/admin-crm";
import { VIP_TIERS } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SEGMENTS: { key: CrmSegment; label: string }[] = [
  { key: "all", label: "All Players" },
  { key: "new", label: "New (7d)" },
  { key: "active", label: "Active (7d)" },
  { key: "vip", label: "VIP" },
  { key: "banned", label: "Suspended" },
];

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

function syncUrl(segment: CrmSegment, page: number) {
  window.history.replaceState(null, "", `/admin/crm?segment=${segment}&page=${page}`);
}

export function CrmPlayersPanel({
  initialSegment,
  initialPage,
  initialData,
}: {
  initialSegment: CrmSegment;
  initialPage: number;
  initialData: CrmPlayersPage;
}) {
  const [segment, setSegment] = useState(initialSegment);
  const [page, setPage] = useState(initialPage);
  const [data, setData] = useState(initialData);
  const [pending, startTransition] = useTransition();

  const load = useCallback((nextSegment: CrmSegment, nextPage: number) => {
    startTransition(async () => {
      const result = await fetchCrmPlayersAction({ segment: nextSegment, page: nextPage });
      if (!result.ok) return;
      setSegment(nextSegment);
      setPage(nextPage);
      setData(result.data);
      syncUrl(nextSegment, nextPage);
    });
  }, []);

  return (
    <>
      <div
        role="tablist"
        aria-label="Player segments"
        className="mb-4 inline-flex flex-wrap gap-1 rounded-full border border-violet-400/20 bg-[rgba(18,14,34,0.5)] p-1"
      >
        {SEGMENTS.map((s) => (
          <button
            key={s.key}
            type="button"
            role="tab"
            aria-selected={s.key === segment}
            disabled={pending}
            onClick={() => load(s.key, 1)}
            className={cn(
              "min-h-9 rounded-full px-4 py-1.5 text-sm font-medium transition-colors disabled:opacity-70",
              s.key === segment
                ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white"
                : "text-slate-400 hover:text-white"
            )}
          >
            {s.label}
          </button>
        ))}
        {pending ? (
          <span className="flex items-center px-2 text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          </span>
        ) : null}
      </div>

      <div className={cn(CARD, pending && "opacity-60")}>
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
              {data.rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                    No players in this segment.
                  </td>
                </tr>
              ) : (
                data.rows.map(({ profile: p, deposits: stats }) => (
                  <tr key={p.id} className="border-b border-white/[0.04]">
                    <td className="px-4 py-3">
                      <p className="font-medium text-white">
                        {p.full_name || p.email}
                        {p.is_suspended && (
                          <Badge className="ml-2 bg-red-500/20 text-red-300 text-xs">
                            Suspended
                          </Badge>
                        )}
                      </p>
                      <p className="text-xs text-slate-500">
                        Joined {relativeTime(p.created_at)}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className="bg-violet-500/15 text-violet-200 capitalize">
                        {tierLabel(p.vip_tier)}
                      </Badge>
                      <p className="mt-1 text-xs text-slate-500">{p.vip_points} pts</p>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-300">
                      ${Number(p.wallet_balance).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {stats && stats.fulfilledCount > 0 ? (
                        <>
                          <p className="font-semibold text-emerald-300">
                            ${stats.totalDeposited.toLocaleString()}
                          </p>
                          <p className="text-xs text-slate-500">
                            {stats.fulfilledCount}{" "}
                            {stats.fulfilledCount === 1 ? "deposit" : "deposits"}
                          </p>
                        </>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="max-w-[140px] truncate text-xs text-slate-400">{p.email}</p>
                      {(p.phone || p.whatsapp) && (
                        <p className="text-xs text-slate-500">
                          {[p.phone, p.whatsapp].filter(Boolean).join(" · ")}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {p.last_seen_at ? relativeTime(p.last_seen_at) : "Never"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button asChild variant="outline" size="sm">
                        <Link href="/admin/users">Users</Link>
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {data.totalPages > 1 && (
        <div className="mt-4 flex flex-col gap-3 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <p>
            Page {data.page} of {data.totalPages} · {data.total.toLocaleString()} players
          </p>
          <div className="flex gap-2">
            {data.page > 1 && (
              <Button
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => load(segment, data.page - 1)}
              >
                <ChevronLeft className="h-4 w-4" aria-hidden />
                Prev
              </Button>
            )}
            {data.page < data.totalPages && (
              <Button
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => load(segment, data.page + 1)}
              >
                Next
                <ChevronRight className="h-4 w-4" aria-hidden />
              </Button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
