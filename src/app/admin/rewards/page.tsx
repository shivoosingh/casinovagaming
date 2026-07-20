import type { Metadata } from "next";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminSqlRequiredNotice } from "@/components/admin/admin-sql-required-notice";
import { RewardsPanel } from "@/components/admin/rewards-panel";
import { adminDb, isMissingRelation } from "@/lib/actions/admin/core";
import { requirePermission } from "@/lib/data/admin";

export const metadata: Metadata = { title: "Rewards" };
export const dynamic = "force-dynamic";

export default async function AdminRewardsPage() {
  await requirePermission("rewards.manage");
  const db = adminDb();

  const { data, error } = await db
    .from("reward_rules")
    .select("id, key, name, description, reward_type, amount, wallet_type, is_active")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error && !isMissingRelation(error)) {
    throw new Error(error.message);
  }

  return (
    <div className="mx-auto max-w-4xl">
      <AdminPageHeader
        title="Rewards"
        description="Manage reward rules and manually grant rewards — always credits wallet_balance or the cash-out wallet, never bonus_wallet."
      />

      {error && isMissingRelation(error) ? (
        <AdminSqlRequiredNotice title="Rewards need the Phase 2 admin SQL" />
      ) : (
        <RewardsPanel rules={(data ?? []).map((r) => ({ ...r, amount: Number(r.amount) }))} />
      )}
    </div>
  );
}
