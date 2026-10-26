"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { AgentBalanceRow } from "@/lib/actions/admin/agent-balances";
import { cn } from "@/lib/utils";

function formatCoins(value: number | null): string {
  if (value === null || Number.isNaN(value)) return "—";
  return value.toLocaleString(undefined, {
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

const PLACEHOLDER_ROWS: AgentBalanceRow[] = [
  "Juwa",
  "Vegas Sweeps",
  "Game Vault",
  "MR All-in-One",
  "Gameroom",
  "Cash Frenzy",
  "Cash Machine",
  "Mafia",
  "Orion Stars",
  "Milky Way",
  "Fire Kirin",
].map((game) => ({
  game,
  coins: null,
  error: "Loading…",
}));

export function AdminAgentBalancesCard() {
  const [rows, setRows] = useState<AgentBalanceRow[]>(PLACEHOLDER_ROWS);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async (quiet = false) => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/agent-balances", {
        cache: "no-store",
        signal: AbortSignal.timeout(55_000),
      });
      const data = (await res.json()) as {
        ok: boolean;
        rows?: AgentBalanceRow[];
        checkedAt?: string;
        error?: string;
      };

      if (!data.ok || !data.rows) {
        if (!quiet) toast.error(data.error || "Failed to load balances");
        setRows((prev) =>
          prev.map((row) =>
            row.error === "Loading…"
              ? { ...row, error: data.error || "Failed to load" }
              : row
          )
        );
        return;
      }

      setRows(data.rows);
      setCheckedAt(data.checkedAt ?? new Date().toISOString());
      if (!quiet) toast.success("Balances updated");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load balances";
      if (!quiet) toast.error(msg);
      setRows((prev) =>
        prev.map((row) =>
          row.coins === null && row.error === "Loading…"
            ? { ...row, error: "Timed out" }
            : row
        )
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh(true);
  }, [refresh]);

  return (
    <div className="overflow-hidden rounded-2xl border border-violet-400/25 bg-[rgba(18,14,34,0.72)] backdrop-blur-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-violet-500/20 px-4 py-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">Game store coins</p>
          <p className="text-xs text-slate-400">
            Live balance on each game backend
            {checkedAt ? ` · checked ${new Date(checkedAt).toLocaleTimeString()}` : ""}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={loading}
          onClick={() => void refresh(false)}
          className="border-violet-400/30"
        >
          <RefreshCw className={cn("mr-2 size-3.5", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      <div className="divide-y divide-white/[0.04]">
        {rows.map((row) => (
          <div key={row.game} className="flex items-center justify-between gap-3 px-4 py-3">
            <p className="min-w-0 truncate text-sm font-medium text-white">{row.game}</p>
            <div className="shrink-0 text-right">
              {row.coins === null ? (
                <p
                  className={cn(
                    "text-sm",
                    row.error === "Loading…" ? "text-slate-500" : "text-amber-300/90"
                  )}
                  title={row.error}
                >
                  {row.error === "Not configured"
                    ? "Not set up"
                    : row.error === "Loading…"
                      ? "…"
                      : "Error"}
                </p>
              ) : (
                <p
                  className={cn(
                    "text-sm font-semibold tabular-nums",
                    row.coins <= 0
                      ? "text-red-300"
                      : row.coins < 50
                        ? "text-amber-300"
                        : "text-emerald-300"
                  )}
                >
                  {formatCoins(row.coins)}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
