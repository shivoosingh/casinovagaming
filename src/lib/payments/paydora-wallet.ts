import { createAdminClient } from "@/lib/supabase/admin";

async function alreadyApplied(userId: string, marker: string) {
  const admin = createAdminClient();
  if (!admin) return false;
  const { data } = await admin
    .from("wallet_transactions")
    .select("id")
    .eq("user_id", userId)
    .ilike("description", `%${marker}%`)
    .limit(1)
    .maybeSingle();
  return Boolean(data?.id);
}

export async function creditPaydoraDeposit(input: {
  userId: string;
  amount: number;
  depositId: string;
  referenceId?: string | null;
}) {
  const admin = createAdminClient();
  if (!admin) throw new Error("Admin client unavailable");
  if (!input.userId || input.amount <= 0) return { credited: false };

  const marker = input.depositId;
  if (await alreadyApplied(input.userId, marker)) return { credited: false, duplicate: true };

  const { data: profile } = await admin
    .from("profiles")
    .select("wallet_balance")
    .eq("id", input.userId)
    .maybeSingle();

  const currentBalance = Number(profile?.wallet_balance || 0);
  const newBalance = currentBalance + input.amount;

  await admin.from("profiles").update({ wallet_balance: newBalance }).eq("id", input.userId);
  await admin.from("wallet_transactions").insert({
    user_id: input.userId,
    amount: input.amount,
    wallet_type: "current",
    transaction_type: "credit",
    source: "paydora_deposit",
    description: `Paydora deposit $${input.amount.toFixed(2)} (${input.referenceId || "order"} ${marker})`,
    created_by: null,
  });

  return { credited: true, newBalance };
}

export async function reversePaydoraDeposit(input: {
  userId: string;
  amount: number;
  depositId: string;
}) {
  const admin = createAdminClient();
  if (!admin) throw new Error("Admin client unavailable");
  const marker = `refund:${input.depositId}`;
  if (await alreadyApplied(input.userId, marker)) return { reversed: false, duplicate: true };

  const { data: profile } = await admin
    .from("profiles")
    .select("wallet_balance")
    .eq("id", input.userId)
    .maybeSingle();

  const currentBalance = Number(profile?.wallet_balance || 0);
  const newBalance = Math.max(0, currentBalance - input.amount);

  await admin.from("profiles").update({ wallet_balance: newBalance }).eq("id", input.userId);
  await admin.from("wallet_transactions").insert({
    user_id: input.userId,
    amount: input.amount,
    wallet_type: "current",
    transaction_type: "debit",
    source: "paydora_refund",
    description: `Paydora refund $${input.amount.toFixed(2)} (refund:${input.depositId})`,
    created_by: null,
  });

  return { reversed: true, newBalance };
}
