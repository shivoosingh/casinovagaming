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
import { creditUserWallet } from "@/lib/actions/wallet";
import { createNotification } from "@/lib/actions/notifications";

const PERMISSION = "rewards.manage";

function revalidateRewards() {
  revalidatePath("/admin/rewards");
}

const ruleSchema = z.object({
  key: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9_]+$/, "Key must be lowercase letters, numbers, and underscores"),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional().default(""),
  reward_type: z.enum([
    "daily",
    "weekly",
    "monthly",
    "streak_milestone",
    "referral",
    "seasonal",
    "promotional",
    "manual",
  ]),
  amount: z.coerce.number().min(0),
  wallet_type: z.enum(["current", "cashout"]),
  is_active: z.boolean(),
});

export async function upsertRewardRuleAction(
  input: z.infer<typeof ruleSchema> & { id?: string }
): Promise<AdminActionResult> {
  const auth = await authorize(PERMISSION);
  if ("error" in auth) return { ok: false, error: auth.error };

  const parsed = ruleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };

  const payload = {
    key: parsed.data.key,
    name: parsed.data.name,
    description: parsed.data.description || "",
    reward_type: parsed.data.reward_type,
    amount: parsed.data.amount,
    wallet_type: parsed.data.wallet_type,
    is_active: parsed.data.is_active,
    created_by: auth.staff.userId,
  };

  const db = adminDb();
  const result = input.id
    ? await db.from("reward_rules").update(payload).eq("id", input.id)
    : await db.from("reward_rules").insert(payload);

  if (result.error) {
    if (isMissingRelation(result.error)) return { ok: false, error: RUN_ADMIN_SQL_HINT };
    return { ok: false, error: result.error.message };
  }

  await writeAudit({
    actorId: auth.staff.userId,
    action: input.id ? "reward_rule.update" : "reward_rule.create",
    entityType: "reward_rule",
    entityId: input.id ?? null,
    after: payload,
  });

  revalidateRewards();
  return { ok: true, message: "Reward rule saved." };
}

export async function deleteRewardRuleAction(id: string): Promise<AdminActionResult> {
  const auth = await authorize(PERMISSION);
  if ("error" in auth) return { ok: false, error: auth.error };

  const { error } = await adminDb().from("reward_rules").delete().eq("id", id);
  if (error) {
    if (isMissingRelation(error)) return { ok: false, error: RUN_ADMIN_SQL_HINT };
    return { ok: false, error: error.message };
  }

  await writeAudit({ actorId: auth.staff.userId, action: "reward_rule.delete", entityType: "reward_rule", entityId: id });
  revalidateRewards();
  return { ok: true, message: "Reward rule deleted." };
}

/** Manually grant a reward rule to a player — always credits wallet_balance
 * or cashout_wallet (per the rule's wallet_type), never bonus_wallet. */
export async function grantRewardAction(input: {
  ruleId: string;
  userId: string;
  note?: string;
}): Promise<AdminActionResult> {
  const auth = await authorize(PERMISSION);
  if ("error" in auth) return { ok: false, error: auth.error };

  const db = adminDb();
  const { data: rule, error: ruleError } = await db
    .from("reward_rules")
    .select("id, key, name, amount, wallet_type")
    .eq("id", input.ruleId)
    .single();

  if (ruleError || !rule) {
    if (isMissingRelation(ruleError)) return { ok: false, error: RUN_ADMIN_SQL_HINT };
    return { ok: false, error: ruleError?.message ?? "Reward rule not found." };
  }

  const amount = Number(rule.amount);
  if (!amount || amount <= 0) return { ok: false, error: "This rule has no reward amount configured." };

  const walletType = rule.wallet_type === "cashout" ? "cashout" : "current";
  const credit = await creditUserWallet(
    input.userId,
    amount,
    walletType,
    `reward:${rule.key}`,
    input.note?.trim() || `Reward grant: ${rule.name}`
  );
  if (credit.error) return { ok: false, error: credit.error };

  const { error: claimError } = await db.from("reward_claims").insert({
    user_id: input.userId,
    rule_id: rule.id,
    amount,
    wallet_type: walletType,
    granted_by: auth.staff.userId,
    note: input.note?.trim() || null,
  });
  if (claimError && !isMissingRelation(claimError)) {
    return { ok: false, error: claimError.message };
  }

  await createNotification(
    input.userId,
    "Reward granted",
    `You received a $${amount.toFixed(2)} reward: ${rule.name}.`,
    "success"
  );

  await writeAudit({
    actorId: auth.staff.userId,
    action: "reward.grant",
    entityType: "reward_claim",
    entityId: rule.id,
    after: { userId: input.userId, amount, walletType },
  });

  revalidateRewards();
  return { ok: true, message: `Granted $${amount.toFixed(2)} to player's ${walletType} wallet.` };
}
