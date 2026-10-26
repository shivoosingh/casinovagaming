import type { Metadata } from "next";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminSqlRequiredNotice } from "@/components/admin/admin-sql-required-notice";
import { NewslettersPanel } from "@/components/admin/newsletters-panel";
import { adminDb, isMissingRelation } from "@/lib/actions/admin/core";
import { requirePermission } from "@/lib/data/admin";

export const metadata: Metadata = { title: "Newsletters" };
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function AdminNewslettersPage() {
  await requirePermission("newsletters.manage");
  const db = adminDb();

  const { data, error } = await db
    .from("newsletter_campaigns")
    .select("id, name, subject, heading, body, cta_label, cta_href, segment, status, sent_count, total_recipients")
    .order("created_at", { ascending: false })
    .limit(400);

  if (error && !isMissingRelation(error)) {
    throw new Error(error.message);
  }

  return (
    <div className="mx-auto max-w-5xl">
      <AdminPageHeader
        title="Newsletters"
        description="Promos are in folders, with today's suggestions at the top. Open one, use it or make a variation, then Staff sends a test and Players emails everyone. Free Resend sends 100 a day."
      />

      {error && isMissingRelation(error) ? (
        <AdminSqlRequiredNotice title="Newsletters need the Phase 2 admin SQL" />
      ) : (
        <NewslettersPanel campaigns={data ?? []} />
      )}
    </div>
  );
}
