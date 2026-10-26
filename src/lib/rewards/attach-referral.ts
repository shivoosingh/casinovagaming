import { REFERRAL_REWARD_POINTS, vipTierForPoints } from "@/lib/constants";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Attach a signup referral once. Safe to call from email confirm and from
 * immediate signup. Skips if a row already exists so points are not doubled.
 */
export async function attachSignupReferral(userId: string, rawCode: string | null | undefined) {
  const code = rawCode?.trim().toUpperCase();
  if (!userId || !code) return;

  const admin = createAdminClient();
  if (!admin) return;

  const { data: profile } = await admin
    .from("profiles")
    .select("id, referred_by")
    .eq("id", userId)
    .maybeSingle();
  if (!profile) return;

  const { data: existing } = await admin
    .from("referrals")
    .select("id")
    .eq("referred_id", userId)
    .maybeSingle();
  if (existing) return;

  const { data: referrer } = await admin
    .from("profiles")
    .select("id, vip_points")
    .eq("referral_code", code)
    .maybeSingle();
  if (!referrer || referrer.id === userId) return;

  if (!profile.referred_by) {
    await admin.from("profiles").update({ referred_by: referrer.id }).eq("id", userId);
  } else if (profile.referred_by !== referrer.id) {
    return;
  }

  const { error: insertError } = await admin.from("referrals").insert({
    referrer_id: referrer.id,
    referred_id: userId,
    reward_points: REFERRAL_REWARD_POINTS,
  });
  if (insertError) {
    if (!/duplicate|unique/i.test(insertError.message)) {
      console.error("[referral] insert:", insertError.message);
    }
    return;
  }

  const nextPoints = Number(referrer.vip_points ?? 0) + REFERRAL_REWARD_POINTS;
  await admin
    .from("profiles")
    .update({
      vip_points: nextPoints,
      vip_tier: vipTierForPoints(nextPoints),
    })
    .eq("id", referrer.id);
}
