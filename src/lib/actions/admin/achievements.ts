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

const PERMISSION = "achievements.manage";

function revalidateAchievements() {
  revalidatePath("/admin/achievements");
}

const achievementSchema = z.object({
  key: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9_]+$/, "Key must be lowercase letters, numbers, and underscores"),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional().default(""),
  category: z.enum(["gameplay", "social", "loyalty", "milestone", "seasonal", "special"]),
  rarity: z.enum(["common", "rare", "epic", "legendary"]),
  icon: z.string().trim().min(1).max(60).default("trophy"),
  condition_type: z.enum([
    "vip_points",
    "total_deposits",
    "total_deposit_amount",
    "total_referrals",
    "total_spins",
    "manual",
  ]),
  condition_value: z.coerce.number().min(0),
  reward_amount: z.coerce.number().min(0),
  is_secret: z.boolean(),
  is_active: z.boolean(),
  sort_order: z.coerce.number().int().default(100),
});

export async function upsertAchievementAction(
  input: z.infer<typeof achievementSchema> & { id?: string }
): Promise<AdminActionResult> {
  const auth = await authorize(PERMISSION);
  if ("error" in auth) return { ok: false, error: auth.error };

  const parsed = achievementSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };

  const payload = {
    key: parsed.data.key,
    name: parsed.data.name,
    description: parsed.data.description || "",
    category: parsed.data.category,
    rarity: parsed.data.rarity,
    icon: parsed.data.icon,
    condition_type: parsed.data.condition_type,
    condition_value: parsed.data.condition_value,
    reward_amount: parsed.data.reward_amount,
    is_secret: parsed.data.is_secret,
    is_active: parsed.data.is_active,
    sort_order: parsed.data.sort_order,
  };

  const db = adminDb();
  const result = input.id
    ? await db.from("achievements").update(payload).eq("id", input.id)
    : await db.from("achievements").insert(payload);

  if (result.error) {
    if (isMissingRelation(result.error)) return { ok: false, error: RUN_ADMIN_SQL_HINT };
    return { ok: false, error: result.error.message };
  }

  await writeAudit({
    actorId: auth.staff.userId,
    action: input.id ? "achievement.update" : "achievement.create",
    entityType: "achievement",
    entityId: input.id ?? null,
    after: payload,
  });

  revalidateAchievements();
  return { ok: true, message: "Achievement saved." };
}

export async function deleteAchievementAction(id: string): Promise<AdminActionResult> {
  const auth = await authorize(PERMISSION);
  if ("error" in auth) return { ok: false, error: auth.error };

  const { error } = await adminDb().from("achievements").delete().eq("id", id);
  if (error) {
    if (isMissingRelation(error)) return { ok: false, error: RUN_ADMIN_SQL_HINT };
    return { ok: false, error: error.message };
  }

  await writeAudit({ actorId: auth.staff.userId, action: "achievement.delete", entityType: "achievement", entityId: id });
  revalidateAchievements();
  return { ok: true, message: "Achievement deleted." };
}
