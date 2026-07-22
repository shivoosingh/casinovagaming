import type { Metadata } from "next";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminSqlRequiredNotice } from "@/components/admin/admin-sql-required-notice";
import { NewslettersPanel } from "@/components/admin/newsletters-panel";
import { adminDb, isMissingRelation } from "@/lib/actions/admin/core";
import { requirePermission } from "@/lib/data/admin";

export const metadata: Metadata = { title: "Newsletters" };
export const dynamic = "force-dynamic";

export default async function AdminNewslettersPage() {
  await requirePermission("newsletters.manage");
  const db = adminDb();

  const { data, error } = await db
    .from("newsletter_campaigns")
    .select("id, name, subject, heading, body, cta_label, cta_href, segment, status, sent_count, total_recipients")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error && !isMissingRelation(error)) {
    throw new Error(error.message);
  }

  return (
    <div className="mx-auto max-w-4xl">
      <AdminPageHeader
        title="Newsletters"
        description="Compose campaigns and send them as in-app notifications — no external email pipeline needed."
      />

      {error && isMissingRelation(error) ? (
        <AdminSqlRequiredNotice title="Newsletters need the Phase 2 admin SQL" />
      ) : (
        <NewslettersPanel campaigns={data ?? []} />
      )}
    </div>
  );
}
