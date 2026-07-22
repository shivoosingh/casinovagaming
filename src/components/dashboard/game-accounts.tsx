"use client";

import Link from "next/link";
import Image from "next/image";
import { ExternalLink, Gamepad2, Wallet } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { GlassCard } from "@/components/shared/glass-card";
import { Button } from "@/components/ui/button";
import type { ActiveJob, MyGameAccount } from "@/lib/data/my-games";
import { cn } from "@/lib/utils";

const JOB_LABELS: Record<string, string> = {
  new_account: "Creating…",
  create_account: "Creating…",
  reload: "Loading…",
  load: "Loading…",
  redeem: "Redeeming…",
  check_balance: "Checking…",
};

function JobPill({ job }: { job: ActiveJob }) {
  const label = JOB_LABELS[job.loadType] ?? "Working…";
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-300">
      <span className="size-1.5 animate-pulse rounded-full bg-amber-400" aria-hidden />
      {label}
    </span>
  );
}

function GameAccountCard({
  account,
  activeJob,
}: {
  account: MyGameAccount;
  activeJob?: ActiveJob;
}) {
  const isPending = account.pending || activeJob?.loadType === "create_account" || activeJob?.loadType === "new_account";
  const job = isPending
    ? activeJob ?? { loadType: "create_account", status: "pending" }
    : activeJob;
  const syncedAt = account.completedAt
    ? formatDistanceToNow(new Date(account.completedAt), { addSuffix: true })
    : null;

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-violet-400/20 bg-[rgba(18,14,34,0.65)] p-4">
      <div className="flex items-center gap-3">
        <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-violet-500/20">
          {account.gameImage ? (
            <Image
              src={account.gameImage}
              alt={account.gameName}
              fill
              className="object-cover"
              sizes="48px"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm font-bold text-violet-200">
              {account.gameName.slice(0, 2).toUpperCase()}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-semibold text-white">{account.gameName}</p>
            {job && <JobPill job={job} />}
          </div>
          <p className="truncate text-xs text-slate-400">@{account.gameUsername}</p>
        </div>
      </div>

      <div className="flex items-end justify-between gap-2">
        <div>
          {isPending ? (
            <>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Status</p>
              <p className="text-sm text-slate-400">Account setup in progress…</p>
            </>
          ) : (
            <>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Account</p>
              <p className="text-sm font-medium text-emerald-300">Ready</p>
              {syncedAt && (
                <p className="mt-0.5 text-xs text-slate-500">Created {syncedAt}</p>
              )}
            </>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1.5">
          {!isPending && (
            <Button asChild size="sm" variant="outline" className="shrink-0 border-violet-400/30">
              <Link href={`/games/${account.gameSlug}`}>Manage / Load</Link>
            </Button>
          )}
          <Button asChild size="sm" variant="ghost" className="shrink-0 text-slate-300">
            <Link href={`/games/${account.gameSlug}`}>
              <ExternalLink className="size-3.5" aria-hidden />
              Open
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

export function GameAccountsSection({
  accounts,
  walletBalance,
  activeJobs = {},
}: {
  accounts: MyGameAccount[];
  walletBalance: number;
  activeJobs?: Record<string, ActiveJob>;
}) {
  return (
    <GlassCard className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Linked accounts
        </p>
        <div className="flex items-center gap-2 text-sm">
          <Wallet className="size-4 text-amber-300" aria-hidden />
          <span className="text-slate-400">Wallet</span>
          <span className="font-bold tabular-nums text-amber-300">
            ${walletBalance.toLocaleString()}
          </span>
          <Button asChild size="sm" variant="outline" className="ml-1 border-violet-400/30">
            <Link href="/dashboard/deposit">Add Funds</Link>
          </Button>
        </div>
      </div>

      {accounts.length === 0 ? (
        <div className="mt-4 flex flex-col items-center gap-3 py-6 text-center">
          <Gamepad2 className="size-10 text-violet-400/40" aria-hidden />
          <p className="text-sm font-medium text-white">No game accounts yet</p>
          <p className="max-w-sm text-xs text-slate-400">
            Open a game, create your free account there, then come back here to see it and load
            credits.
          </p>
          <Button asChild size="sm" variant="outline" className="mt-1 border-violet-400/30">
            <Link href="/games">Browse games</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map((account) => (
            <GameAccountCard
              key={account.id}
              account={account}
              activeJob={activeJobs[account.gameSlug]}
            />
          ))}
        </div>
      )}
    </GlassCard>
  );
}

export function GameJobLog({
  rows,
}: {
  rows: Array<{
    id: string;
    gameSlug: string;
    gameName: string;
    load_type: string;
    status: string;
    amount: number | null;
    created_at: string;
    error_message: string | null;
  }>;
}) {
  if (!rows.length) return null;

  return (
    <GlassCard className="p-6">
      <p className="mb-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">
        Recent game activity
      </p>
      <ul className="divide-y divide-white/5">
        {rows.map((row) => (
          <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
            <div className="min-w-0">
              <Link
                href={`/games/${row.gameSlug}`}
                className="font-medium text-white hover:text-fuchsia-300"
              >
                {row.gameName}
              </Link>
              <p className="text-xs text-slate-500">
                {row.load_type.replace(/_/g, " ")}
                {row.amount != null ? ` · $${Number(row.amount).toLocaleString()}` : ""}
              </p>
            </div>
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                row.status === "completed" && "bg-emerald-500/15 text-emerald-300",
                row.status === "failed" && "bg-rose-500/15 text-rose-300",
                (row.status === "pending" || row.status === "processing") &&
                  "bg-amber-500/15 text-amber-300"
              )}
            >
              {row.status}
            </span>
          </li>
        ))}
      </ul>
    </GlassCard>
  );
}
