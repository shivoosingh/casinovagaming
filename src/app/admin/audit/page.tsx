import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminSqlRequiredNotice } from "@/components/admin/admin-sql-required-notice";
import { adminDb, isMissingRelation } from "@/lib/actions/admin/core";
import { requirePermission } from "@/lib/data/admin";

export const metadata: Metadata = { title: "Audit Logs" };
export const dynamic = "force-dynamic";

export default async function AdminAuditPage() {
  await requirePermission("audit.read");
  const db = adminDb();

  const { data: rows, error } = await db
    .from("audit_logs")
    .select("id, actor_id, action, entity_type, entity_id, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error && !isMissingRelation(error)) {
    throw new Error(error.message);
  }

  return (
    <div className="mx-auto max-w-5xl">
      <AdminPageHeader title="Audit Logs" description={`${rows?.length ?? 0} recent events`} />
      {error && isMissingRelation(error) ? (
        <AdminSqlRequiredNotice title="Audit logs need the Phase 2 admin SQL" />
      ) : (rows?.length ?? 0) === 0 ? (
        <div className="rounded-2xl border border-violet-400/20 py-16 text-center text-slate-400">
          No audit events yet. Actions you take in admin will appear here.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-violet-400/25">
          <table className="w-full text-left text-sm">
            <thead className="bg-black/30 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Entity</th>
                <th className="px-4 py-3">Actor</th>
              </tr>
            </thead>
            <tbody>
              {rows!.map((r) => (
                <tr key={r.id} className="border-t border-white/5 text-slate-300">
                  <td className="px-4 py-3 whitespace-nowrap">
                    {new Date(r.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 font-medium text-white">{r.action}</td>
                  <td className="px-4 py-3">
                    {r.entity_type}
                    {r.entity_id ? ` · ${String(r.entity_id).slice(0, 8)}` : ""}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{String(r.actor_id ?? "").slice(0, 8)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
