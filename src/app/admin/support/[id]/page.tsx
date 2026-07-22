import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { SupportTicketThread } from "@/components/admin/support-ticket-thread";
import { adminDb } from "@/lib/actions/admin/core";
import { requirePermission } from "@/lib/data/admin";

export const metadata: Metadata = { title: "Ticket" };
export const dynamic = "force-dynamic";

const CATEGORY_LABEL: Record<string, string> = {
  account: "Account",
  rewards: "Rewards",
  deposits: "Deposits",
  payouts: "Payouts",
  technical: "Technical",
  other: "Other",
};

export default async function AdminTicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("support.manage");
  const { id } = await params;
  const db = adminDb();

  const { data: ticket } = await db
    .from("support_tickets")
    .select("id, ticket_no, subject, category, status, priority, assigned_to, user_id")
    .eq("id", id)
    .maybeSingle();

  if (!ticket) notFound();

  const [{ data: messages }, { data: player }] = await Promise.all([
    db
      .from("ticket_messages")
      .select("id, is_staff, body, created_at")
      .eq("ticket_id", id)
      .order("created_at", { ascending: true }),
    db.from("profiles").select("full_name, email").eq("id", ticket.user_id).maybeSingle(),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/admin/support" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Support inbox
      </Link>

      <AdminPageHeader
        title={ticket.subject}
        description={`#${ticket.ticket_no} · ${CATEGORY_LABEL[ticket.category] ?? ticket.category} · from ${
          player?.full_name || player?.email || "player"
        }`}
      />

      <SupportTicketThread
        ticketId={ticket.id}
        status={ticket.status}
        assigned={Boolean(ticket.assigned_to)}
        messages={messages ?? []}
      />
    </div>
  );
}
