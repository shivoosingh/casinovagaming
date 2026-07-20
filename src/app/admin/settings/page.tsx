import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminSqlNeeded } from "@/components/admin/admin-sql-needed";
import { AdminSimpleForm } from "@/components/admin/admin-simple-form";
import { adminDb } from "@/lib/actions/admin/core";
import { upsertSiteSetting } from "@/lib/actions/admin/modules";
import { adminTableReady } from "@/lib/admin/table-ready";
import { requirePermission } from "@/lib/data/admin";

export const metadata: Metadata = { title: "Settings" };

export default async function AdminSettingsPage() {
  await requirePermission("settings.manage");
  const ready = await adminTableReady("site_settings");
  if (!ready) {
    return (
      <div className="mx-auto max-w-3xl">
        <AdminPageHeader title="Settings" description="Site configuration keys" />
        <AdminSqlNeeded moduleName="Settings" />
      </div>
    );
  }

  const { data: rows } = await adminDb()
    .from("site_settings")
    .select("key, value, updated_at")
    .order("key");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <AdminPageHeader title="Settings" description="Key/value site settings (JSON or text)" />
      <AdminSimpleForm
        submitLabel="Save setting"
        action={upsertSiteSetting}
        fields={[
          { name: "key", label: "Key", defaultValue: "maintenance_mode" },
          { name: "value", label: "Value (JSON or text)", type: "textarea", defaultValue: '{"enabled":false}' },
        ]}
      />
      <div className="space-y-2">
        {(rows ?? []).map((r) => (
          <div key={r.key} className="rounded-xl border border-violet-400/20 bg-black/20 p-3 text-sm">
            <p className="font-mono text-violet-200">{r.key}</p>
            <pre className="mt-1 overflow-x-auto text-xs text-slate-400">
              {JSON.stringify(r.value, null, 2)}
            </pre>
          </div>
        ))}
        {(rows?.length ?? 0) === 0 && (
          <p className="text-sm text-slate-500">No settings yet — add one above.</p>
        )}
      </div>
    </div>
  );
}
