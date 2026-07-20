"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  type AdminActionResult,
  adminDb,
  authorize,
  isMissingRelation,
  RUN_ADMIN_SQL_HINT,
  writeAudit,
} from "@/lib/actions/admin/core";
import { createNotification } from "@/lib/actions/notifications";

const PERMISSION = "support.manage";

function revalidateSupport(ticketId?: string) {
  revalidatePath("/admin/support");
  if (ticketId) revalidatePath(`/admin/support/${ticketId}`);
}

export async function updateTicketStatusAction(input: {
  ticketId: string;
  status: "open" | "pending" | "in_progress" | "resolved" | "closed";
}): Promise<AdminActionResult> {
  const auth = await authorize(PERMISSION);
  if ("error" in auth) return { ok: false, error: auth.error };

  const db = adminDb();
  const closedAt = input.status === "closed" || input.status === "resolved" ? new Date().toISOString() : null;
  const { error } = await db
    .from("support_tickets")
    .update({ status: input.status, closed_at: closedAt })
    .eq("id", input.ticketId);

  if (error) {
    if (isMissingRelation(error)) return { ok: false, error: RUN_ADMIN_SQL_HINT };
    return { ok: false, error: error.message };
  }

  await writeAudit({
    actorId: auth.staff.userId,
    action: "ticket.status_update",
    entityType: "support_ticket",
    entityId: input.ticketId,
    after: { status: input.status },
  });

  revalidateSupport(input.ticketId);
  return { ok: true, message: `Ticket marked ${input.status}.` };
}

export async function assignTicketToMeAction(ticketId: string): Promise<AdminActionResult> {
  const auth = await authorize(PERMISSION);
  if ("error" in auth) return { ok: false, error: auth.error };

  const db = adminDb();
  const { error } = await db
    .from("support_tickets")
    .update({ assigned_to: auth.staff.userId })
    .eq("id", ticketId);

  if (error) {
    if (isMissingRelation(error)) return { ok: false, error: RUN_ADMIN_SQL_HINT };
    return { ok: false, error: error.message };
  }

  revalidateSupport(ticketId);
  return { ok: true, message: "Assigned to you." };
}

const replySchema = z.object({
  ticketId: z.string().uuid(),
  body: z.string().trim().min(1).max(5000),
});

export async function staffReplyAction(input: z.infer<typeof replySchema>): Promise<AdminActionResult> {
  const auth = await authorize(PERMISSION);
  if ("error" in auth) return { ok: false, error: auth.error };

  const parsed = replySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };

  const db = adminDb();
  const { data: ticket, error: ticketError } = await db
    .from("support_tickets")
    .select("id, user_id, status")
    .eq("id", parsed.data.ticketId)
    .maybeSingle();

  if (ticketError) {
    if (isMissingRelation(ticketError)) return { ok: false, error: RUN_ADMIN_SQL_HINT };
    return { ok: false, error: ticketError.message };
  }
  if (!ticket) return { ok: false, error: "Ticket not found." };

  const { error } = await db.from("ticket_messages").insert({
    ticket_id: parsed.data.ticketId,
    sender_id: auth.staff.userId,
    is_staff: true,
    body: parsed.data.body,
  });

  if (error) {
    if (isMissingRelation(error)) return { ok: false, error: RUN_ADMIN_SQL_HINT };
    return { ok: false, error: error.message };
  }

  // trg_ticket_messages_touch already flips status open -> in_progress.
  await createNotification(
    ticket.user_id,
    "Support replied",
    parsed.data.body.length > 140 ? `${parsed.data.body.slice(0, 137)}...` : parsed.data.body,
    "info"
  );

  revalidateSupport(parsed.data.ticketId);
  return { ok: true, message: "Reply sent." };
}
