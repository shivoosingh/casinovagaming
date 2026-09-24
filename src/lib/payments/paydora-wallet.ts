import { createAdminClient } from "@/lib/supabase/admin";

const ALLOWED_METHODS = new Set(["paypal", "chime", "cashapp", "bitcoin", "usdt", "venmo"]);

export function paydoraProofPath(depositId: string) {
  return `paydora/${depositId}`;
}

export function isPaydoraProofPath(path: string | null | undefined) {
  return Boolean(path?.startsWith("paydora/"));
}

export function mapPaydoraMethod(value?: string | null) {
  const v = (value || "").trim().toLowerCase();
  if (ALLOWED_METHODS.has(v)) return v;
  if (v.includes("chime")) return "chime";
  if (v.includes("cash")) return "cashapp";
  if (v.includes("venmo")) return "venmo";
  if (v.includes("paypal")) return "paypal";
  if (v.includes("bitcoin") || v.includes("btc")) return "bitcoin";
  if (v.includes("usdt") || v.includes("tether")) return "usdt";
  return "cashapp";
}

async function alreadyApplied(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  userId: string,
  marker: string
) {
  const { data } = await admin
    .from("wallet_transactions")
    .select("id")
    .eq("user_id", userId)
    .ilike("description", `%${marker}%`)
    .limit(1)
    .maybeSingle();
  return Boolean(data?.id);
}

async function ensureDepositRequest(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  input: {
    userId: string;
    amount: number;
    depositId: string;
    referenceId?: string | null;
    methodValue?: string | null;
    methodName?: string | null;
    gameName?: string | null;
    gameSlug?: string | null;
  }
) {
  const proof = paydoraProofPath(input.depositId);
  const methodName = input.methodName?.trim() || "Paydora";
  const row = {
    user_id: input.userId,
    game_slug: input.gameSlug?.trim() || null,
    game_name: input.gameName?.trim() || `Instant deposit · ${methodName}`,
    payment_method: mapPaydoraMethod(input.methodValue || input.methodName),
    amount: input.amount,
    proof_url: proof,
    status: "completed",
    wallet_credited: true,
    admin_notes: input.referenceId ? `Paid online · ${input.referenceId}` : "Paid online",
  };

  const { data: existing } = await admin
    .from("deposit_requests")
    .select("id")
    .eq("proof_url", proof)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await admin
      .from("deposit_requests")
      .update({
        status: "completed",
        wallet_credited: true,
        amount: input.amount,
      })
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
    return;
  }

  const { error } = await admin.from("deposit_requests").insert(row);
  if (error) throw new Error(error.message);
}

export async function creditPaydoraDeposit(input: {
  userId: string;
  amount: number;
  depositId: string;
  referenceId?: string | null;
  methodValue?: string | null;
  methodName?: string | null;
  gameName?: string | null;
  gameSlug?: string | null;
}) {
  const admin = createAdminClient();
  if (!admin) throw new Error("Admin client unavailable");
  if (!input.userId || input.amount <= 0 || !input.depositId) return { credited: false };

  const amount = Math.round(input.amount * 100) / 100;
  const marker = input.depositId;

  if (await alreadyApplied(admin, input.userId, marker)) {
    await ensureDepositRequest(admin, { ...input, amount });
    return { credited: false, duplicate: true };
  }

  const methodName = input.methodName?.trim() || "Paydora";
  const description = `Deposit confirmed — $${amount.toFixed(2)} via ${methodName} (${input.referenceId || "order"} ${marker})`;

  const { data: txRow, error: txError } = await admin
    .from("wallet_transactions")
    .insert({
      user_id: input.userId,
      amount,
      wallet_type: "current",
      transaction_type: "credit",
      source: "deposit",
      description,
      created_by: null,
    })
    .select("id")
    .single();

  if (txError || !txRow?.id) {
    throw new Error(txError?.message || "Could not save the deposit transaction");
  }

  const { count } = await admin
    .from("wallet_transactions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", input.userId)
    .ilike("description", `%${marker}%`);

  if ((count ?? 0) > 1) {
    await admin.from("wallet_transactions").delete().eq("id", txRow.id);
    await ensureDepositRequest(admin, { ...input, amount });
    return { credited: false, duplicate: true };
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("wallet_balance")
    .eq("id", input.userId)
    .maybeSingle();

  const currentBalance = Number(profile?.wallet_balance || 0);
  const newBalance = Math.round((currentBalance + amount) * 100) / 100;

  const { data: updated, error: updateError } = await admin
    .from("profiles")
    .update({ wallet_balance: newBalance })
    .eq("id", input.userId)
    .select("wallet_balance")
    .single();

  if (updateError || Number(updated?.wallet_balance) + 0.009 < newBalance) {
    await admin.from("wallet_transactions").delete().eq("id", txRow.id);
    throw new Error(updateError?.message || "Wallet balance did not update");
  }

  await ensureDepositRequest(admin, { ...input, amount });

  await admin.from("notifications").insert({
    user_id: input.userId,
    title: "Deposit confirmed",
    message: `$${amount.toFixed(2)} has been added to your wallet via ${methodName}.`,
    type: "success",
    is_read: false,
  });

  return { credited: true, newBalance: Number(updated.wallet_balance) };
}

export async function reversePaydoraDeposit(input: {
  userId: string;
  amount: number;
  depositId: string;
}) {
  const admin = createAdminClient();
  if (!admin) throw new Error("Admin client unavailable");
  const marker = `refund:${input.depositId}`;
  if (await alreadyApplied(admin, input.userId, marker)) return { reversed: false, duplicate: true };

  const amount = Math.round(input.amount * 100) / 100;
  const { data: profile } = await admin
    .from("profiles")
    .select("wallet_balance")
    .eq("id", input.userId)
    .maybeSingle();

  const currentBalance = Number(profile?.wallet_balance || 0);
  const newBalance = Math.max(0, Math.round((currentBalance - amount) * 100) / 100);

  const { error: updateError } = await admin
    .from("profiles")
    .update({ wallet_balance: newBalance })
    .eq("id", input.userId);

  if (updateError) throw new Error(updateError.message);

  const { error: txError } = await admin.from("wallet_transactions").insert({
    user_id: input.userId,
    amount,
    wallet_type: "current",
    transaction_type: "debit",
    source: "deposit",
    description: `Paydora refund $${amount.toFixed(2)} (${marker})`,
    created_by: null,
  });

  if (txError) throw new Error(txError.message);

  await admin
    .from("deposit_requests")
    .update({ status: "rejected", admin_notes: "Paydora refunded this deposit" })
    .eq("proof_url", paydoraProofPath(input.depositId));

  return { reversed: true, newBalance };
}
