"use client";

import { useMemo } from "react";
import Link from "next/link";
import { X, Radio, Wallet, Gift } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AdminTransactionRow } from "@/lib/actions/wallet";
import {
  formatTransactionAmount,
  transactionSourceLabel,
  transactionSummary,
  categorizeAdminTransactionPanel,
  walletColumnSummaryStats,
  type WalletTransactionRow,
} from "@/lib/wallet/transaction-display";
import { formatDate, formatRelativeTime, cn } from "@/lib/utils";
import type { AdminTransactionUser } from "@/components/admin/admin-user-transaction-hub";

function TransactionEntry({ row }: { row: AdminTransactionRow }) {
  const tx = row as WalletTransactionRow;
  const isDebit = row.transaction_type === "debit";

  return (
    <div className="border-b border-white/[0.06] py-3 last:border-0 last:pb-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className="text-[10px]">
              {transactionSourceLabel(row.source)}
            </Badge>
            <Badge variant={isDebit ? "warning" : "success"} className="text-[10px]">
              {isDebit ? "Debit" : "Credit"}
            </Badge>
          </div>
          <p className="line-clamp-2 text-sm">{transactionSummary(tx)}</p>
          <p className="mt-1 text-xs text-slate-500">
            {formatDate(row.created_at)} · {formatRelativeTime(row.created_at)}
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 text-base font-bold tabular-nums",
            isDebit ? "text-amber-400" : "text-emerald-400"
          )}
        >
          {formatTransactionAmount(Number(row.amount), tx.transaction_type)}
        </span>
      </div>
    </div>
  );
}

function TransactionSection({
  title,
  icon: Icon,
  transactions,
  emptyHint,
}: {
  title: string;
  icon: typeof Wallet;
  transactions: AdminTransactionRow[];
  emptyHint: string;
}) {
  const { loadsOut, creditsIn, redeemedBack, loadRefunds } = walletColumnSummaryStats(transactions);

  return (
    <div className="rounded-xl border border-violet-400/20 bg-[rgba(18,14,34,0.72)] p-4">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-cyan-300" />
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <Badge variant="outline" className="ml-auto text-[10px]">
          {transactions.length} tx
        </Badge>
      </div>
      <div className="mb-3 flex flex-wrap gap-3 text-xs text-slate-500">
        {loadsOut > 0 && <span className="text-amber-400">Loads out: −${loadsOut.toFixed(2)}</span>}
        {creditsIn > 0 && <span className="text-emerald-400">Credits in: +${creditsIn.toFixed(2)}</span>}
        {loadRefunds > 0 && <span>Refunds: +${loadRefunds.toFixed(2)}</span>}
        {redeemedBack > 0 && <span className="text-sky-400">Redeemed: +${redeemedBack.toFixed(2)}</span>}
      </div>
      <div className="max-h-[320px] overflow-y-auto">
        {transactions.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">{emptyHint}</p>
        ) : (
          transactions.map((row) => <TransactionEntry key={row.id} row={row} />)
        )}
      </div>
    </div>
  );
}

interface AdminTransactionSidebarPanelProps {
  user: AdminTransactionUser;
  transactions: AdminTransactionRow[];
  open: boolean;
  live?: boolean;
  onClose: () => void;
}

export function AdminTransactionSidebarPanel({
  user,
  transactions,
  open,
  live,
  onClose,
}: AdminTransactionSidebarPanelProps) {
  const userTransactions = useMemo(() => {
    const mine = transactions.filter((t) => t.user?.id === user.id);
    return {
      deposit: mine.filter((t) => categorizeAdminTransactionPanel(t) === "deposit"),
      bonus: mine.filter((t) => categorizeAdminTransactionPanel(t) === "bonus"),
    };
  }, [transactions, user.id]);

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
          "fixed inset-y-0 left-0 z-50 flex w-full max-w-lg flex-col border-r border-violet-400/25 bg-[#0b0c1b] shadow-2xl transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "-translate-x-full"
        )}
        aria-hidden={!open}
        aria-label={`Transactions for ${displayName}`}
      >
        <div className="flex items-start justify-between gap-3 border-b border-violet-500/20 px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-violet-300/70">
              Transactions
            </p>
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

        <div className="flex items-center justify-between border-b border-white/[0.04] px-5 py-3 text-sm">
          <div className="flex gap-4">
            <span>
              Wallet{" "}
              <strong className="text-emerald-300">
                ${Number(user.wallet_balance ?? 0).toLocaleString()}
              </strong>
            </span>
            <span>
              Redeem{" "}
              <strong className="text-cyan-300">
                ${Number(user.cashout_wallet ?? 0).toLocaleString()}
              </strong>
            </span>
          </div>
          {live && (
            <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
              <Radio className="h-3 w-3 animate-pulse" />
              Live
            </span>
          )}
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          <TransactionSection
            title="Total Deposit"
            icon={Wallet}
            transactions={userTransactions.deposit}
            emptyHint="No deposit-wallet loads or redeems yet."
          />
          <TransactionSection
            title="Bonus / Promotions"
            icon={Gift}
            transactions={userTransactions.bonus}
            emptyHint="No bonus-wallet activity yet."
          />
        </div>

        <div className="border-t border-violet-500/20 px-5 py-4 space-y-2">
          <Button asChild variant="outline" size="sm" className="w-full">
            <Link href={`/admin/users?userId=${user.id}`}>Open user panel</Link>
          </Button>
        </div>
      </aside>
    </>
  );
}
