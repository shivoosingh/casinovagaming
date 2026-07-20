import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminSqlNeeded } from "@/components/admin/admin-sql-needed";
import { adminDb } from "@/lib/actions/admin/core";
import { adminTableReady } from "@/lib/admin/table-ready";
import { requirePermission } from "@/lib/data/admin";

export const metadata: Metadata = { title: "Audit Logs" };

export default async function AdminAuditPage() {
  await requirePermission("audit.read");
  const ready = await adminTableReady("audit_logs");
  if (!ready) {
    return (
      <div className="mx-auto max-w-4xl">
        <AdminPageHeader title="Audit Logs" description="Staff action history" />
        <AdminSqlNeeded moduleName="Audit Logs" />
      </div>
    );
  }

  const { data: rows } = await adminDb()
    .from("audit_logs")
    .select("id, actor_id, action, entity_type, entity_id, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="mx-auto max-w-5xl">
      <AdminPageHeader title="Audit Logs" description={`${rows?.length ?? 0} recent events`} />
      {(rows?.length ?? 0) === 0 ? (
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
