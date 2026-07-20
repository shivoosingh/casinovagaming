import type { Metadata } from "next";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminSqlRequiredNotice } from "@/components/admin/admin-sql-required-notice";
import { AchievementsPanel } from "@/components/admin/achievements-panel";
import { adminDb, isMissingRelation } from "@/lib/actions/admin/core";
import { requirePermission } from "@/lib/data/admin";

export const metadata: Metadata = { title: "Achievements" };
export const dynamic = "force-dynamic";

export default async function AdminAchievementsPage() {
  await requirePermission("achievements.manage");
  const db = adminDb();

  const { data, error } = await db
    .from("achievements")
    .select(
      "id, key, name, description, category, rarity, icon, condition_type, condition_value, reward_amount, is_secret, is_active, sort_order"
    )
    .order("sort_order", { ascending: true })
    .limit(300);

  if (error && !isMissingRelation(error)) {
    throw new Error(error.message);
  }

  return (
    <div className="mx-auto max-w-4xl">
      <AdminPageHeader
        title="Achievements"
        description="Define unlock conditions from real Casinova metrics (VIP points, deposits, referrals, spins) and optional cash rewards."
      />

      {error && isMissingRelation(error) ? (
        <AdminSqlRequiredNotice title="Achievements need the Phase 2 admin SQL" />
      ) : (
        <AchievementsPanel
          achievements={(data ?? []).map((a) => ({
            ...a,
            condition_value: Number(a.condition_value),
            reward_amount: Number(a.reward_amount),
          }))}
        />
      )}
    </div>
  );
}
