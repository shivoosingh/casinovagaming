import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminSqlNeeded } from "@/components/admin/admin-sql-needed";
import { AdminSimpleForm } from "@/components/admin/admin-simple-form";
import { adminDb } from "@/lib/actions/admin/core";
import { createNewsletterCampaign } from "@/lib/actions/admin/modules";
import { adminTableReady } from "@/lib/admin/table-ready";
import { requirePermission } from "@/lib/data/admin";

export const metadata: Metadata = { title: "Newsletters" };

export default async function AdminNewslettersPage() {
  await requirePermission("newsletters.manage");
  const ready = await adminTableReady("newsletter_campaigns");
  if (!ready) {
    return (
      <div className="mx-auto max-w-4xl">
        <AdminPageHeader title="Newsletters" description="Campaign composer" />
        <AdminSqlNeeded moduleName="Newsletters" />
      </div>
    );
  }

  const { data: rows } = await adminDb()
    .from("newsletter_campaigns")
    .select("id, subject, status, recipient_count, sent_at, created_at")
    .order("created_at", { ascending: false })
    .limit(30);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <AdminPageHeader
        title="Newsletters"
        description="Sends an in-app notification to all non-admin users (email SMTP campaigns can be added later)"
      />
      <AdminSimpleForm
        submitLabel="Send to all users"
        action={createNewsletterCampaign}
        fields={[
          { name: "subject", label: "Subject" },
          { name: "body", label: "Body", type: "textarea" },
        ]}
      />
      <div className="space-y-2">
        {(rows ?? []).map((r) => (
          <div key={r.id} className="rounded-xl border border-violet-400/20 p-4 text-sm">
            <p className="font-semibold text-white">{r.subject}</p>
            <p className="text-xs text-slate-500">
              {r.status} · {r.recipient_count} recipients
              {r.sent_at ? ` · ${new Date(r.sent_at).toLocaleString()}` : ""}
            </p>
          </div>
        ))}
        {(rows?.length ?? 0) === 0 && (
          <p className="text-center text-sm text-slate-500">No campaigns yet.</p>
        )}
      </div>
    </div>
  );
}
