import { createAdminClient } from "@/lib/supabase/admin";
import { awardDepositRewardsOnce } from "@/lib/rewards/award-deposit";

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
  const { data: tx } = await admin
    .from("wallet_transactions")
    .select("id")
    .eq("user_id", userId)
    .ilike("description", `%${marker}%`)
    .limit(1)
    .maybeSingle();
  if (tx?.id) return true;

  const { data: dep } = await admin
    .from("deposit_requests")
    .select("id, wallet_credited, status")
    .eq("proof_url", paydoraProofPath(marker))
    .maybeSingle();

  return Boolean(dep && (dep.wallet_credited || dep.status === "completed"));
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
    .select("id, status")
    .eq("proof_url", proof)
    .maybeSingle();

  if (existing?.id) {
    // A refunded deposit is marked rejected. A late or repeated "paid"
    // notification must not flip it back to completed (and so make it
    // eligible for rewards again).
    if (existing.status === "rejected") return existing.id as string;

    const { error } = await admin
      .from("deposit_requests")
      .update({
        status: "completed",
        wallet_credited: true,
        amount: input.amount,
      })
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
    return existing.id as string;
  }

  const { data: inserted, error } = await admin
    .from("deposit_requests")
    .insert(row)
    .select("id")
    .single();
  if (!error && inserted?.id) return inserted.id as string;

  // Unique index on the provider id: another request for the same payment
  // inserted the row a moment ago. Use that row instead of failing.
  if (error?.code === "23505") {
    const { data: raced } = await admin
      .from("deposit_requests")
      .select("id")
      .eq("proof_url", proof)
      .maybeSingle();
    if (raced?.id) return raced.id as string;
  }
  throw new Error(error?.message ?? "Could not record the deposit");
}

/**
 * VIP points and referral share for a credited card deposit. Idempotent, so it
 * is also called on the duplicate path: a retry heals an award that failed.
 */
async function awardRewards(depositRequestId: string) {
  const result = await awardDepositRewardsOnce(depositRequestId);
  return result.status !== "failed";
}

async function applyWalletCredit(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  input: {
    userId: string;
    amount: number;
    source: string;
    description: string;
  }
) {
  const { error: rpcError } = await admin.rpc("credit_system_wallet", {
    p_user_id: input.userId,
    p_amount: input.amount,
    p_source: input.source,
    p_description: input.description,
  });

  if (!rpcError) {
    const { data: profile } = await admin
      .from("profiles")
      .select("wallet_balance")
      .eq("id", input.userId)
      .maybeSingle();
    return Number(profile?.wallet_balance || 0);
  }

  const missingRpc =
    rpcError.code === "42883" ||
    rpcError.message.includes("Could not find the function") ||
    rpcError.message.includes("credit_system_wallet");

  if (!missingRpc) {
    throw new Error(rpcError.message);
  }

  // Fallback after protect_wallet_columns allows service_role
  const { data: profile } = await admin
    .from("profiles")
    .select("wallet_balance")
    .eq("id", input.userId)
    .maybeSingle();

  const currentBalance = Number(profile?.wallet_balance || 0);
  const newBalance = Math.round((currentBalance + input.amount) * 100) / 100;

  const { data: updated, error: updateError } = await admin
    .from("profiles")
    .update({ wallet_balance: newBalance })
    .eq("id", input.userId)
    .select("wallet_balance")
    .single();

  if (updateError) throw new Error(updateError.message);

  if (Math.abs(Number(updated?.wallet_balance) - newBalance) > 0.009) {
    throw new Error(
      "Wallet balance did not update. Run supabase/paydora-system-wallet-credit.sql in Supabase."
    );
  }

  const { error: txError } = await admin.from("wallet_transactions").insert({
    user_id: input.userId,
    amount: input.amount,
    wallet_type: "current",
    transaction_type: "credit",
    source: input.source,
    description: input.description,
    created_by: null,
  });

  if (txError) throw new Error(txError.message);
  return Number(updated.wallet_balance);
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
  if (!input.userId || input.amount <= 0 || !input.depositId) return { credited: false, rewardsOk: true };

  const amount = Math.round(input.amount * 100) / 100;
  const marker = input.depositId;

  if (await alreadyApplied(admin, input.userId, marker)) {
    const depositRequestId = await ensureDepositRequest(admin, { ...input, amount });
    const rewardsOk = await awardRewards(depositRequestId);
    return { credited: false, duplicate: true, rewardsOk };
  }

  const methodName = input.methodName?.trim() || "Paydora";
  const description = `Deposit confirmed — $${amount.toFixed(2)} via ${methodName} (${input.referenceId || "order"} ${marker})`;

  const newBalance = await applyWalletCredit(admin, {
    userId: input.userId,
    amount,
    source: "deposit",
    description,
  });

  const depositRequestId = await ensureDepositRequest(admin, { ...input, amount });

  await admin.from("notifications").insert({
    user_id: input.userId,
    title: "Deposit confirmed",
    message: `$${amount.toFixed(2)} has been added to your wallet via ${methodName}.`,
    type: "success",
    is_read: false,
  });

  const rewardsOk = await awardRewards(depositRequestId);

  return { credited: true, newBalance, rewardsOk };
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

  const { data: updated, error: updateError } = await admin
    .from("profiles")
    .update({ wallet_balance: newBalance })
    .eq("id", input.userId)
    .select("wallet_balance")
    .single();

  if (updateError) throw new Error(updateError.message);

  if (Math.abs(Number(updated?.wallet_balance) - newBalance) > 0.009) {
    throw new Error(
      "Wallet balance did not update. Run supabase/paydora-system-wallet-credit.sql in Supabase."
    );
  }

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

  return { reversed: true, newBalance: Number(updated.wallet_balance) };
}
