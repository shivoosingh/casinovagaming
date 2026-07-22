import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, LifeBuoy } from "lucide-react";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminSqlRequiredNotice } from "@/components/admin/admin-sql-required-notice";
import { Badge } from "@/components/ui/badge";
import { adminDb, isMissingRelation } from "@/lib/actions/admin/core";
import { requirePermission } from "@/lib/data/admin";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Support Tickets" };
export const dynamic = "force-dynamic";

const FILTERS = [
  { key: "active", label: "Active", statuses: ["open", "pending", "in_progress"] },
  { key: "resolved", label: "Resolved", statuses: ["resolved"] },
  { key: "closed", label: "Closed", statuses: ["closed"] },
] as const;

const STATUS_BADGE: Record<string, string> = {
  open: "bg-blue-500/15 text-blue-300",
  pending: "bg-amber-500/15 text-amber-300",
  in_progress: "bg-violet-500/15 text-violet-200",
  resolved: "bg-emerald-500/15 text-emerald-300",
  closed: "bg-slate-500/15 text-slate-400",
};

const PRIORITY_BADGE: Record<string, string> = {
  low: "bg-slate-500/15 text-slate-400",
  normal: "bg-blue-500/15 text-blue-300",
  high: "bg-amber-500/15 text-amber-300",
  urgent: "bg-red-500/15 text-red-300",
};

export default async function AdminSupportPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  await requirePermission("support.manage");
  const params = await searchParams;
  const filter = FILTERS.find((f) => f.key === params.filter) ?? FILTERS[0];

  const db = adminDb();
  const { data, error } = await db
    .from("support_tickets")
    .select("id, ticket_no, subject, category, status, priority, last_message_at, user_id")
    .in("status", [...filter.statuses])
    .order("last_message_at", { ascending: false })
    .limit(100);

  if (error && !isMissingRelation(error)) {
    throw new Error(error.message);
  }

  const rows = data ?? [];
  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const { data: profiles } = userIds.length
    ? await db.from("profiles").select("id, full_name, email").in("id", userIds)
    : { data: [] };
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  return (
    <div className="mx-auto max-w-5xl">
      <AdminPageHeader title="Support Tickets" description="Player support inbox — reply, triage and resolve conversations." />

      <div className="mb-4 inline-flex gap-1 rounded-full border border-violet-400/20 bg-[rgba(18,14,34,0.6)] p-1">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={`/admin/support?filter=${f.key}`}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              f.key === filter.key ? "bg-violet-600 text-white" : "text-slate-400 hover:text-white"
            )}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {error && isMissingRelation(error) ? (
        <AdminSqlRequiredNotice title="Support tickets need the Phase 2 admin SQL" />
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-violet-400/25 bg-[rgba(18,14,34,0.72)] py-16 text-center text-slate-400">
          <LifeBuoy className="mx-auto mb-2 h-6 w-6 text-slate-500" />
          No {filter.label.toLowerCase()} tickets.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-violet-400/25 bg-[rgba(18,14,34,0.72)]">
          <div className="divide-y divide-white/[0.04]">
            {rows.map((t) => {
              const p = profileMap.get(t.user_id);
              return (
                <Link
                  key={t.id}
                  href={`/admin/support/${t.id}`}
                  className="flex items-center gap-4 px-4 py-4 transition-colors hover:bg-white/[0.03] sm:px-6"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">#{t.ticket_no}</span>
                      <span className="text-xs text-slate-500">{p?.full_name || p?.email || "player"}</span>
                    </div>
                    <p className="mt-0.5 truncate text-sm font-semibold text-white">{t.subject}</p>
                    <p className="text-xs text-slate-500">
                      Updated {new Date(t.last_message_at).toLocaleString()}
                    </p>
                  </div>
                  <Badge className={PRIORITY_BADGE[t.priority] ?? "bg-slate-500/15"}>{t.priority}</Badge>
                  <Badge className={STATUS_BADGE[t.status] ?? "bg-slate-500/15"}>{t.status.replace("_", " ")}</Badge>
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-500" />
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
