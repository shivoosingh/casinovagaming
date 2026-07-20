"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { recomputeLeaderboardAction } from "@/lib/actions/admin/leaderboards";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const CARD = "rounded-2xl border border-violet-400/25 bg-[rgba(18,14,34,0.72)] backdrop-blur-xl";

const PERIODS = ["daily", "weekly", "monthly", "all_time"] as const;
const METRICS = ["deposits", "referrals", "spins"] as const;

export function RecomputeControls({
  period,
  metric,
}: {
  period: (typeof PERIODS)[number];
  metric: (typeof METRICS)[number];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function recompute(finalize: boolean) {
    startTransition(async () => {
      const result = await recomputeLeaderboardAction({ period, metric, finalize });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "Recomputed");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" onClick={() => recompute(false)} disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Recompute
      </Button>
      <Button size="sm" variant="outline" onClick={() => recompute(true)} disabled={pending}>
        Recompute &amp; finalize
      </Button>
    </div>
  );
}

export function LeaderboardFilters({
  period,
  metric,
}: {
  period: (typeof PERIODS)[number];
  metric: (typeof METRICS)[number];
}) {
  const router = useRouter();
  const [p, setP] = useState(period);
  const [m, setM] = useState(metric);

  function go(nextPeriod: string, nextMetric: string) {
    router.push(`/admin/leaderboards?period=${nextPeriod}&metric=${nextMetric}`);
  }

  return (
    <div className={cn(CARD, "flex flex-wrap items-end gap-4 p-4")}>
      <div>
        <p className="mb-1 text-[10px] uppercase tracking-wide text-slate-500">Period</p>
        <Select
          value={p}
          onValueChange={(v) => {
            setP(v as typeof p);
            go(v, m);
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIODS.map((x) => (
              <SelectItem key={x} value={x}>
                {x.replace("_", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <p className="mb-1 text-[10px] uppercase tracking-wide text-slate-500">Metric</p>
        <Select
          value={m}
          onValueChange={(v) => {
            setM(v as typeof m);
            go(p, v);
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {METRICS.map((x) => (
              <SelectItem key={x} value={x}>
                {x}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <RecomputeControls period={p} metric={m} />
    </div>
  );
}
