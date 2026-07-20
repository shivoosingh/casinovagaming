import type { Metadata } from "next";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminSqlRequiredNotice } from "@/components/admin/admin-sql-required-notice";
import { LeaderboardFilters } from "@/components/admin/leaderboards-panel";
import { adminDb, isMissingRelation } from "@/lib/actions/admin/core";
import { requirePermission } from "@/lib/data/admin";

export const metadata: Metadata = { title: "Leaderboards" };
export const dynamic = "force-dynamic";

const PERIODS = ["daily", "weekly", "monthly", "all_time"] as const;
const METRICS = ["deposits", "referrals", "spins"] as const;

const METRIC_LABEL: Record<string, string> = {
  deposits: "Total deposits ($)",
  referrals: "Referrals made",
  spins: "Spin winnings ($)",
};

export default async function AdminLeaderboardsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; metric?: string }>;
}) {
  await requirePermission("leaderboards.manage");
  const params = await searchParams;
  const period = (PERIODS as readonly string[]).includes(params.period ?? "") ? (params.period as (typeof PERIODS)[number]) : "all_time";
  const metric = (METRICS as readonly string[]).includes(params.metric ?? "") ? (params.metric as (typeof METRICS)[number]) : "deposits";

  const db = adminDb();
  const { data, error } = await db
    .from("leaderboard_entries")
    .select("id, user_id, score, rank, finalized, computed_at")
    .eq("period", period)
    .eq("metric", metric)
    .order("rank", { ascending: true })
    .limit(100);

  if (error && !isMissingRelation(error)) {
    throw new Error(error.message);
  }

  const rows = data ?? [];
  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const { data: profiles } = userIds.length
    ? await db.from("profiles").select("id, full_name, email").in("id", userIds)
    : { data: [] };
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  return (
    <div className="mx-auto max-w-4xl">
      <AdminPageHeader
        title="Leaderboards"
        description="Recompute rankings from live Casinova data (deposits, referrals, spin winnings) and finalize a period when it's over."
      />

      {error && isMissingRelation(error) ? (
        <AdminSqlRequiredNotice title="Leaderboards need the Phase 2 admin SQL" />
      ) : (
        <div className="space-y-4">
          <LeaderboardFilters period={period} metric={metric} />

          <div className="overflow-hidden rounded-2xl border border-violet-400/25 bg-[rgba(18,14,34,0.72)]">
            <div className="border-b border-violet-500/20 px-4 py-3">
              <p className="text-sm font-semibold text-white">
                {period.replace("_", " ")} · {METRIC_LABEL[metric]}
              </p>
            </div>
            {rows.length === 0 ? (
              <p className="p-8 text-center text-sm text-slate-400">
                No entries yet — click Recompute to generate this leaderboard.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-violet-500/20 text-[11px] uppercase tracking-wider text-violet-300/70">
                    <tr>
                      <th className="px-4 py-3 font-bold">Rank</th>
                      <th className="px-4 py-3 font-bold">Player</th>
                      <th className="px-4 py-3 text-right font-bold">Score</th>
                      <th className="px-4 py-3 font-bold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const p = profileMap.get(r.user_id);
                      return (
                        <tr key={r.id} className="border-b border-white/[0.04]">
                          <td className="px-4 py-3 font-bold text-violet-200">#{r.rank}</td>
                          <td className="px-4 py-3 text-white">{p?.full_name || p?.email || r.user_id.slice(0, 8)}</td>
                          <td className="px-4 py-3 text-right font-semibold text-emerald-300">
                            {metric === "referrals" ? Number(r.score).toFixed(0) : `$${Number(r.score).toFixed(2)}`}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-400">{r.finalized ? "Finalized" : "Live"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
