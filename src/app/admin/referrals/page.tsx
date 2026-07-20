import type { Metadata } from "next";
import { UserPlus } from "lucide-react";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { adminDb } from "@/lib/actions/admin/core";
import { requirePermission } from "@/lib/data/admin";

export const metadata: Metadata = { title: "Referrals" };

export default async function AdminReferralsPage() {
  await requirePermission("referrals.manage");

  let total = 0;
  let rows: {
    id: string;
    reward_points: number | null;
    created_at: string;
    referrer: { email?: string | null; full_name?: string | null } | null;
    referred: { email?: string | null; full_name?: string | null } | null;
  }[] = [];

  try {
    const db = adminDb();
    const [countRes, recentRes] = await Promise.all([
      db.from("referrals").select("id", { count: "exact", head: true }),
      db
        .from("referrals")
        .select(
          "id, reward_points, created_at, referrer:profiles!referrals_referrer_id_fkey(email, full_name), referred:profiles!referrals_referred_id_fkey(email, full_name)"
        )
        .order("created_at", { ascending: false })
        .limit(50),
    ]);
    total = countRes.count ?? 0;
    rows = (recentRes.data as typeof rows) ?? [];
  } catch {
    rows = [];
  }

  return (
    <div className="mx-auto max-w-6xl">
      <AdminPageHeader
        title="Referrals"
        description="Casinova referral signups and reward points."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-violet-400/25 bg-[rgba(18,14,34,0.72)] p-4">
          <div className="mb-2 flex items-center gap-2 text-violet-300">
            <UserPlus className="h-4 w-4" />
            <span className="text-[11px] font-bold uppercase tracking-wider">Total referrals</span>
          </div>
          <p className="text-2xl font-black text-white">{total.toLocaleString()}</p>
        </div>
        <div className="rounded-2xl border border-violet-400/25 bg-[rgba(18,14,34,0.72)] p-4">
          <div className="mb-2 flex items-center gap-2 text-fuchsia-300">
            <UserPlus className="h-4 w-4" />
            <span className="text-[11px] font-bold uppercase tracking-wider">Recent (shown)</span>
          </div>
          <p className="text-2xl font-black text-white">{rows.length.toLocaleString()}</p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-violet-400/20 bg-[rgba(18,14,34,0.6)] p-8 text-center">
          <p className="font-semibold text-white">No referrals yet</p>
          <p className="mt-1 text-sm text-slate-400">
            Referral activity will appear here as members invite friends.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-violet-400/25 bg-[rgba(18,14,34,0.72)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-violet-500/20 text-[11px] uppercase tracking-wider text-violet-300/70">
                <tr>
                  <th className="px-4 py-3 font-bold">Referrer → Referred</th>
                  <th className="px-4 py-3 text-right font-bold">Points</th>
                  <th className="px-4 py-3 text-right font-bold">Created</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-white/[0.04]">
                    <td className="px-4 py-3">
                      <p className="font-medium text-white">
                        {r.referrer?.full_name || r.referrer?.email || "—"}{" "}
                        <span className="text-slate-500">→</span>{" "}
                        {r.referred?.full_name || r.referred?.email || "—"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {r.referrer?.email || "—"} → {r.referred?.email || "—"}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-violet-200">
                      {r.reward_points ?? 0}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-slate-500">
                      {new Date(r.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
