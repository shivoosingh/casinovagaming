import { createClient } from "@/lib/supabase/server";
import { AdminUsersList } from "@/components/admin/admin-users-list";

const USER_COLUMNS =
  "id, full_name, email, phone, whatsapp, role, is_suspended, vip_tier, vip_points, wallet_balance, bonus_wallet, cashout_wallet, bonus_redeem_wallet, created_at, last_seen_at";

function aggregateDeposits(
  rows: { user_id: string; amount: number | string | null }[]
): Map<string, { fulfilledCount: number; totalDeposited: number }> {
  const map = new Map<string, { fulfilledCount: number; totalDeposited: number }>();
  for (const row of rows) {
    const existing = map.get(row.user_id) ?? { fulfilledCount: 0, totalDeposited: 0 };
    existing.fulfilledCount += 1;
    existing.totalDeposited += Number(row.amount ?? 0);
    map.set(row.user_id, existing);
  }
  return map;
}

export default async function AdminUsersPage() {
  const supabase = await createClient();

  const { data: users } = await supabase
    .from("profiles")
    .select(USER_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(200);

  const userIds = (users ?? []).map((user) => user.id);
  let depositMap = new Map<string, { fulfilledCount: number; totalDeposited: number }>();

  if (userIds.length > 0) {
    const { data: depositRows } = await supabase
      .from("deposit_requests")
      .select("user_id, amount")
      .in("user_id", userIds)
      .eq("status", "completed");

    depositMap = aggregateDeposits(depositRows ?? []);
  }

  const usersWithDeposits = (users ?? []).map((user) => ({
    ...user,
    deposits: depositMap.get(user.id) ?? null,
  }));

  return (
    <div>
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl font-bold sm:text-3xl">User Management</h1>
        <p className="text-sm text-slate-400 sm:text-base">
          Browse players, open a user panel to grant or reset wallet balances
        </p>
      </div>

      <AdminUsersList users={usersWithDeposits} />
    </div>
  );
}
