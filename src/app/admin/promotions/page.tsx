import type { Metadata } from "next";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminSqlRequiredNotice } from "@/components/admin/admin-sql-required-notice";
import { PromotionsPanel } from "@/components/admin/promotions-panel";
import { adminDb, isMissingRelation } from "@/lib/actions/admin/core";
import { requirePermission } from "@/lib/data/admin";

export const metadata: Metadata = { title: "Promotions" };
export const dynamic = "force-dynamic";

export default async function AdminPromotionsPage() {
  await requirePermission("promotions.manage");
  const db = adminDb();

  const { data, error } = await db
    .from("promotions")
    .select(
      "id, slug, title, summary, description, image_url, badge_text, bonus_amount, code, status, is_featured, priority, starts_at, ends_at"
    )
    .order("priority", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(200);

  if (error && !isMissingRelation(error)) {
    throw new Error(error.message);
  }

  return (
    <div className="mx-auto max-w-4xl">
      <AdminPageHeader title="Promotions" description="Create, schedule and expire promotions shown on the site." />

      {error && isMissingRelation(error) ? (
        <AdminSqlRequiredNotice title="Promotions need the Phase 2 admin SQL" />
      ) : (
        <PromotionsPanel
          promotions={(data ?? []).map((p) => ({ ...p, bonus_amount: Number(p.bonus_amount) }))}
        />
      )}
    </div>
  );
}
