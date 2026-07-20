"use server";

import { revalidatePath } from "next/cache";
import { adminDb, authorize, writeAudit, type AdminActionResult } from "./core";

export async function payoutCashout(formData: FormData): Promise<AdminActionResult> {
  const auth = await authorize("requests.manage");
  if ("error" in auth) return { ok: false, error: auth.error };

  const userId = String(formData.get("user_id") ?? "").trim();
  const amount = Number(formData.get("amount"));
  const note = String(formData.get("note") ?? "").trim();

  if (!userId) return { ok: false, error: "Missing player." };
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: "Enter a payout amount greater than $0." };
  }

  const db = adminDb();
  const { data: newBalance, error } = await db.rpc("admin_payout_cashout", {
    p_user: userId,
    p_amount: amount,
    p_note: note || null,
  });

  if (error) return { ok: false, error: error.message };

  await writeAudit({
    actorId: auth.staff.userId,
    action: "cashout.payout",
    entityType: "profile",
    entityId: userId,
    after: { amount, balance_after: newBalance, note: note || null },
  });

  await db.from("notifications").insert({
    user_id: userId,
    type: "info",
    title: "Cash-out paid",
    message: `$${amount.toFixed(2)} from your cash-out balance has been paid out${note ? ` — ${note}` : "."}`,
  });

  revalidatePath("/admin/payouts");
  return {
    ok: true,
    message: `Paid out $${amount.toFixed(2)}. Remaining: $${Number(newBalance).toFixed(2)}.`,
  };
}
