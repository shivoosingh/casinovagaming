import type { Metadata } from "next";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { VIP_TIERS } from "@/lib/constants";
import { adminDb } from "@/lib/actions/admin/core";
import { requirePermission } from "@/lib/data/admin";

export const metadata: Metadata = { title: "VIP Tiers" };

export default async function AdminVipPage() {
  await requirePermission("vip.manage");
  const db = adminDb();

  const { data: profiles } = await db
    .from("profiles")
    .select("vip_tier, vip_points")
    .eq("role", "user");

  const rows = profiles ?? [];
  const tierCounts = new Map<string, number>();
  let totalPoints = 0;
  let maxPoints = 0;

  for (const p of rows) {
    const tier = p.vip_tier ?? "bronze";
    tierCounts.set(tier, (tierCounts.get(tier) ?? 0) + 1);
    const pts = Number(p.vip_points ?? 0);
    totalPoints += pts;
    if (pts > maxPoints) maxPoints = pts;
  }

  const avgPoints = rows.length ? Math.round(totalPoints / rows.length) : 0;

  return (
    <div className="mx-auto max-w-5xl">
      <AdminPageHeader
        title="VIP Overview"
        description="Member distribution by profiles.vip_tier and VIP points stats. Thresholds are defined in src/lib/constants.ts (VIP_TIERS)."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-violet-400/25 bg-[rgba(18,14,34,0.72)] p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-violet-300/70">
            Total VIP points
          </p>
          <p className="mt-2 text-2xl font-black text-white">
            {totalPoints.toLocaleString()}
          </p>
        </div>
        <div className="rounded-2xl border border-violet-400/25 bg-[rgba(18,14,34,0.72)] p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-violet-300/70">
            Average per player
          </p>
          <p className="mt-2 text-2xl font-black text-white">{avgPoints.toLocaleString()}</p>
        </div>
        <div className="rounded-2xl border border-violet-400/25 bg-[rgba(18,14,34,0.72)] p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-violet-300/70">
            Highest balance
          </p>
          <p className="mt-2 text-2xl font-black text-white">{maxPoints.toLocaleString()}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-violet-400/25 bg-[rgba(18,14,34,0.72)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-violet-500/20 text-[11px] uppercase tracking-wider text-violet-300/70">
              <tr>
                <th className="px-4 py-3 font-bold">Tier</th>
                <th className="px-4 py-3 text-right font-bold">Min points</th>
                <th className="px-4 py-3 text-right font-bold">Members</th>
                <th className="px-4 py-3 font-bold">Benefits</th>
              </tr>
            </thead>
            <tbody>
              {VIP_TIERS.map((tier) => (
                <tr key={tier.id} className="border-b border-white/[0.04]">
                  <td className="px-4 py-3 font-semibold capitalize text-white">{tier.name}</td>
                  <td className="px-4 py-3 text-right text-slate-300">
                    {tier.minPoints.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-violet-200">
                    {(tierCounts.get(tier.id) ?? 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {tier.benefits.join(" · ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-4 text-sm text-slate-500">
        Tier thresholds are read-only from <code className="text-violet-200">VIP_TIERS</code> in{" "}
        <code className="text-violet-200">src/lib/constants.ts</code>. A dedicated{" "}
        <code className="text-violet-200">vip_tiers</code> admin table is not wired yet.
      </p>
    </div>
  );
}
