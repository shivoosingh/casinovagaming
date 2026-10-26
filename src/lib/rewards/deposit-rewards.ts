import type { SupabaseClient } from "@supabase/supabase-js";

import { referralRateForTier, vipTierForPoints } from "@/lib/constants";
import { createNotification } from "@/lib/actions/notifications";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * After a deposit is already credited: VIP points, one active promo bonus,
 * and the referrer's first-deposit percent. Failures here must not undo the deposit.
 */
export async function awardDepositRewards(
  adminSession: SupabaseClient,
  input: { userId: string; amount: number; depositId: string }
) {
  const amount = Math.round(input.amount * 100) / 100;
  if (amount <= 0) return;

  const admin = createAdminClient();
  if (!admin) return;

  await addVipPoints(admin, input.userId, Math.max(1, Math.round(amount)));
  await creditActivePromotion(adminSession, admin, input);
  await creditReferralFirstDeposit(adminSession, admin, input.userId, amount, input.depositId);
}

async function addVipPoints(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  userId: string,
  points: number
) {
  const { data: profile } = await admin
    .from("profiles")
    .select("vip_points")
    .eq("id", userId)
    .maybeSingle();
  if (!profile) return;
  const next = Number(profile.vip_points ?? 0) + points;
  await admin
    .from("profiles")
    .update({ vip_points: next, vip_tier: vipTierForPoints(next) })
    .eq("id", userId);
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

async function creditReferralFirstDeposit(
  adminSession: SupabaseClient,
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  userId: string,
  amount: number,
  depositId: string
) {
  const { count } = await admin
    .from("deposit_requests")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "completed");
  if ((count ?? 0) !== 1) return;

  const { data: player } = await admin
    .from("profiles")
    .select("referred_by")
    .eq("id", userId)
    .maybeSingle();
  if (!player?.referred_by) return;

  const marker = `referred user ${userId}`;
  const { data: already } = await admin
    .from("wallet_transactions")
    .select("id")
    .eq("user_id", player.referred_by)
    .eq("source", "referral_bonus")
    .ilike("description", `%${marker}%`)
    .maybeSingle();
  if (already) return;

  const { data: referrer } = await admin
    .from("profiles")
    .select("vip_tier")
    .eq("id", player.referred_by)
    .maybeSingle();

  const bonus = Math.round(amount * referralRateForTier(referrer?.vip_tier) * 100) / 100;
  if (bonus <= 0) return;

  const { error } = await adminSession.rpc("credit_wallet", {
    p_user_id: player.referred_by,
    p_amount: bonus,
    p_wallet_type: "current",
    p_source: "referral_bonus",
    p_description: `Referral bonus $${bonus.toFixed(2)} from first deposit ${depositId} (${marker})`,
  });
  if (error) {
    console.error("[referral] bonus credit:", error.message);
    return;
  }

  await createNotification(
    player.referred_by,
    "Referral bonus",
    `$${bonus.toFixed(2)} was added to your Total Deposit wallet from a friend's first deposit.`,
    "success"
  );
}
