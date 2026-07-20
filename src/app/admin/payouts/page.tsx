import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { PayoutForm } from "@/components/admin/payout-form";
import { adminDb } from "@/lib/actions/admin/core";
import { requirePermission } from "@/lib/data/admin";

export const metadata: Metadata = { title: "Cash-out Payouts" };

export default async function AdminPayoutsPage() {
  await requirePermission("requests.manage");
  const db = adminDb();

  const [{ data: owed }, { data: history }] = await Promise.all([
    db
      .from("profiles")
      .select("id, full_name, email, cashout_wallet")
      .gt("cashout_wallet", 0)
      .order("cashout_wallet", { ascending: false })
      .limit(200),
    db
      .from("wallet_transactions")
      .select("id, user_id, amount, description, created_at")
      .eq("wallet_type", "cashout")
      .eq("transaction_type", "debit")
      .eq("source", "payout")
      .order("created_at", { ascending: false })
      .limit(25),
  ]);

  const players = owed ?? [];
  const totalOwed = players.reduce((s, p) => s + Number(p.cashout_wallet ?? 0), 0);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <AdminPageHeader
        title="Cash-out Payouts"
        description={`${players.length} awaiting payout · $${totalOwed.toFixed(2)} owed — pay off-platform, then mark paid`}
      />

      {players.length === 0 ? (
        <div className="rounded-2xl border border-violet-400/20 bg-[rgba(18,14,34,0.5)] py-16 text-center text-slate-400">
          No pending cash-outs yet. Balances appear when players redeem winnings.
        </div>
      ) : (
        <div className="space-y-3">
          {players.map((p) => {
            const bal = Number(p.cashout_wallet ?? 0);
            const name = p.full_name || p.email || p.id;
            return (
              <div
                key={p.id}
                className="flex flex-col gap-3 rounded-2xl border border-violet-400/25 bg-[rgba(18,14,34,0.72)] p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-white">{name}</p>
                  <p className="text-xs text-slate-500">{p.email}</p>
                  <p className="mt-1 text-lg font-bold text-emerald-400">${bal.toFixed(2)}</p>
                </div>
                <PayoutForm userId={p.id} maxAmount={bal} playerName={name} />
              </div>
            );
          })}
        </div>
      )}

      {(history?.length ?? 0) > 0 && (
        <div className="rounded-2xl border border-violet-400/20 bg-[rgba(18,14,34,0.5)] p-4">
          <h2 className="mb-3 text-sm font-semibold text-white">Recent payouts</h2>
          <ul className="space-y-2 text-sm text-slate-400">
            {history!.map((h) => (
              <li key={h.id} className="flex justify-between gap-2 border-b border-white/5 pb-2">
                <span>{h.description ?? "Payout"}</span>
                <span className="text-white">${Number(h.amount).toFixed(2)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-xs text-slate-500">
        If &quot;Mark paid&quot; errors about a missing function, run{" "}
        <code className="text-violet-300">admin-essentials-casinova.sql</code> in Supabase.
      </p>
    </div>
  );
}
