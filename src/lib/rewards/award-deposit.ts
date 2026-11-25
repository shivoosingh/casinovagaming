import { VIP_TIERS } from "@/lib/constants";
import { createAdminClient } from "@/lib/supabase/admin";

export type DepositRewardResult =
  | { status: "awarded"; vipPoints: number; referralBonus: number; referrerId: string | null }
  | { status: "already_awarded" | "not_eligible" | "not_found" }
  | { status: "failed"; error: string };

/**
 * Referral share by referrer tier, as the database function expects it:
 * {"bronze":0.05,"silver":0.1,"gold":0.15,"platinum":0.25}. Built from
 * VIP_TIERS so the rates are defined in exactly one place.
 */
export function referralRatesByTier(): Record<string, number> {
  return Object.fromEntries(VIP_TIERS.map((tier) => [tier.id, tier.referralRate]));
}

/** VIP points for a confirmed deposit. Mirrors award_deposit_rewards in SQL. */
export function vipPointsForDeposit(amount: number): number {
  const rounded = Math.round(Math.round(amount * 100) / 100);
  return Math.max(1, rounded);
}

/** Referral share on a referred player's first deposit, to the cent. */
export function referralShareForDeposit(amount: number, referrerTier: string | null | undefined): number {
  const rates = referralRatesByTier();
  const rate = rates[referrerTier ?? ""] ?? rates.bronze;
  return Math.round(amount * rate * 100) / 100;
}

/**
 * Award VIP points and, on a referred player's first deposit, the referrer's
 * share, for one confirmed deposit.
 *
 * Safe to call any number of times for the same deposit: the database function
 * (supabase/fresh-migrations/040-deposit-reward-awards.sql) records each award
 * in deposit_reward_awards and refuses a second one, so webhook retries and a
 * webhook racing the status poll cannot pay twice. It runs with the service
 * role only and never throws: a reward problem must not undo or block a
 * deposit that has already been credited.
 */
export async function awardDepositRewardsOnce(depositRequestId: string): Promise<DepositRewardResult> {
  try {
    const admin = createAdminClient();
    if (!admin) return { status: "failed", error: "Admin client unavailable" };

    const { data, error } = await admin.rpc("award_deposit_rewards", {
      p_deposit_request_id: depositRequestId,
      p_referral_rates: referralRatesByTier(),
    });
    if (error) {
      console.error("[deposit-rewards] award failed:", depositRequestId, error.message);
      return { status: "failed", error: error.message };
    }

    const result = (data ?? {}) as {
      status?: string;
      vip_points?: number;
      referral_bonus?: number;
      referrer_id?: string | null;
    };
    if (result.status === "awarded") {
      return {
        status: "awarded",
        vipPoints: Number(result.vip_points ?? 0),
        referralBonus: Number(result.referral_bonus ?? 0),
        referrerId: result.referrer_id ?? null,
      };
    }
    if (result.status === "already_awarded" || result.status === "not_eligible" || result.status === "not_found") {
      return { status: result.status };
    }
    return { status: "failed", error: `Unexpected result: ${JSON.stringify(result)}` };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[deposit-rewards] award threw:", depositRequestId, message);
    return { status: "failed", error: message };
  }
}
