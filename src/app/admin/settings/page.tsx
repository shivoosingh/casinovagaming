import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminSqlRequiredNotice } from "@/components/admin/admin-sql-required-notice";
import { SettingsEditor } from "@/components/admin/settings-editor";
import { adminDb, isMissingRelation } from "@/lib/actions/admin/core";
import { requirePermission } from "@/lib/data/admin";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  await requirePermission("settings.manage");
  const db = adminDb();
  const { data, error } = await db.from("site_settings").select("key, value");

  if (error && isMissingRelation(error)) {
    return (
      <div className="mx-auto max-w-3xl">
        <AdminPageHeader title="Settings" description="Site settings and feature toggles" />
        <AdminSqlRequiredNotice title="Settings need the admin SQL" />
      </div>
    );
  }
  if (error) throw new Error(error.message);

  const initial: Record<string, unknown> = {};
  for (const row of data ?? []) {
    initial[row.key] = row.value;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <AdminPageHeader
        title="Settings"
        description="Maintenance, registration, Telegram promo, welcome bonus, social links — like Spinora"
      />
      <SettingsEditor initial={initial} />
    </div>
  );
}
