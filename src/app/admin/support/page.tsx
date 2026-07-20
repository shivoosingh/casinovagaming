import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminSqlNeeded } from "@/components/admin/admin-sql-needed";
import { adminDb } from "@/lib/actions/admin/core";
import { updateTicketStatus } from "@/lib/actions/admin/modules";
import { adminTableReady } from "@/lib/admin/table-ready";
import { requirePermission } from "@/lib/data/admin";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Support Tickets" };

export default async function AdminSupportPage() {
  await requirePermission("support.manage");
  const ready = await adminTableReady("support_tickets");
  if (!ready) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <AdminPageHeader
          title="Support Tickets"
          description="Structured tickets (Live Chat remains the main inbox)"
        />
        <AdminSqlNeeded moduleName="Support Tickets" />
        <p className="text-sm text-slate-400">
          Tip: use <a className="text-violet-300 underline" href="/admin/chat">Live Chat</a> for
          real-time support meanwhile.
        </p>
      </div>
    );
  }

  const { data: tickets } = await adminDb()
    .from("support_tickets")
    .select("id, ticket_no, user_id, subject, status, priority, category, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <AdminPageHeader
        title="Support Tickets"
        description="Structured cases — Live Chat is still the primary inbox"
        action={
          <a href="/admin/chat" className="text-sm text-violet-300 underline">
            Open Live Chat
          </a>
        }
      />
      {(tickets?.length ?? 0) === 0 ? (
        <div className="rounded-2xl border border-violet-400/20 py-16 text-center text-slate-400">
          No tickets yet. Empty is normal on a new project.
        </div>
      ) : (
        <div className="space-y-3">
          {tickets!.map((t) => (
            <div
              key={t.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-violet-400/25 bg-[rgba(18,14,34,0.72)] p-4"
            >
              <div>
                <p className="font-semibold text-white">
                  #{t.ticket_no} · {t.subject}
                </p>
                <p className="text-xs text-slate-500">
                  {t.status} · {t.priority} · {t.category}
                </p>
              </div>
              <div className="flex gap-2">
                {(["open", "in_progress", "resolved", "closed"] as const).map((status) => (
                  <form
                    key={status}
                    action={async () => {
                      "use server";
                      await updateTicketStatus(t.id, status);
                    }}
                  >
                    <Button type="submit" size="sm" variant="outline" className="text-xs capitalize">
                      {status.replace("_", " ")}
                    </Button>
                  </form>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
