import type { SupabaseClient } from "@supabase/supabase-js";

import { createNotification } from "@/lib/actions/notifications";
import { createAdminClient } from "@/lib/supabase/admin";
import { awardDepositRewardsOnce } from "@/lib/rewards/award-deposit";

/**
 * After a deposit is already credited: VIP points and the referrer's
 * first-deposit share (both through the idempotent database award, see
 * award-deposit.ts), then one active promo bonus. Failures here must not undo
 * the deposit.
 */
export async function awardDepositRewards(
  adminSession: SupabaseClient,
  input: { userId: string; amount: number; depositId: string }
) {
  const amount = Math.round(input.amount * 100) / 100;
  if (amount <= 0) return;

  await awardDepositRewardsOnce(input.depositId);

  const admin = createAdminClient();
  if (!admin) return;
  await creditActivePromotion(adminSession, admin, input);
}

async function creditActivePromotion(
  adminSession: SupabaseClient,
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  input: { userId: string; depositId: string }
) {
  const now = new Date().toISOString();
  const { data: promos, error } = await admin
    .from("promotions")
    .select("title, bonus_amount, priority, starts_at, ends_at, status")
    .eq("status", "active")
    .gt("bonus_amount", 0)
    .order("priority", { ascending: true })
    .limit(10);

  if (error || !promos?.length) return;

  const promo = promos.find((row) => {
    if (row.starts_at && row.starts_at > now) return false;
    if (row.ends_at && row.ends_at < now) return false;
    return true;
  });
  if (!promo) return;

  const bonus = Math.round(Number(promo.bonus_amount) * 100) / 100;
  if (bonus <= 0) return;

  const { data: already } = await admin
    .from("wallet_transactions")
    .select("id")
    .eq("user_id", input.userId)
    .eq("source", "promotion")
    .ilike("description", `${promo.title} bonus%`)
    .maybeSingle();
  if (already) return;

  const { error: creditError } = await adminSession.rpc("credit_wallet", {
    p_user_id: input.userId,
    p_amount: bonus,
    p_wallet_type: "current",
    p_source: "promotion",
    p_description: `${promo.title} bonus on deposit ${input.depositId}`,
  });
  if (creditError) {
    console.error("[promotion] credit:", creditError.message);
    return;
  }

  await createNotification(
    input.userId,
    "Promotion bonus added",
    `$${bonus.toFixed(2)} from ${promo.title} was added to your Total Deposit wallet.`,
    "success"
  );
}
