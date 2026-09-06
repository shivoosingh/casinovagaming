import { createClient } from "@/lib/supabase/server";
import { getAdminAllTransactions } from "@/lib/actions/wallet";
import { AdminTransactionsLive } from "@/components/admin/admin-transactions-live";

export default async function AdminTransactionsPage() {
  const supabase = await createClient();

  const [result, { data: users }] = await Promise.all([
    getAdminAllTransactions(),
    supabase
      .from("profiles")
      .select("id, full_name, email, wallet_balance, cashout_wallet, created_at, last_seen_at")
      .order("created_at", { ascending: false })
      .limit(2000),
  ]);

  const transactions = "error" in result ? [] : result.transactions;

  return (
    <div>
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold">Transaction Management</h1>
        <p className="text-sm text-slate-400 sm:text-base">
          Browse every player, see recent activity at a glance, and open any user&apos;s full
          transaction history — no typing required.
        </p>
        {"error" in result && (
          <p className="text-sm text-destructive mt-2">{result.error}</p>
        )}
      </div>

      <AdminTransactionsLive
        users={users ?? []}
        initialTransactions={transactions}
      />
    </div>
  );
}
