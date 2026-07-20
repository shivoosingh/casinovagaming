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

const PERMISSION = "promotions.manage";

function revalidatePromotions() {
  revalidatePath("/admin/promotions");
  revalidatePath("/promotions");
  revalidatePath("/");
}

const promotionSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens"),
  title: z.string().trim().min(3).max(160),
  summary: z.string().trim().max(300).optional().default(""),
  description: z.string().trim().max(4000).optional().default(""),
  image_url: z.string().trim().max(500).optional().default(""),
  badge_text: z.string().trim().max(40).optional().default(""),
  bonus_amount: z.coerce.number().min(0).default(0),
  code: z.string().trim().max(40).optional().default(""),
  status: z.enum(["draft", "scheduled", "active", "expired", "archived"]),
  is_featured: z.boolean(),
  priority: z.coerce.number().int().default(100),
  starts_at: z.string().trim().optional().default(""),
  ends_at: z.string().trim().optional().default(""),
});

export async function upsertPromotionAction(
  input: z.infer<typeof promotionSchema> & { id?: string }
): Promise<AdminActionResult> {
  const auth = await authorize(PERMISSION);
  if ("error" in auth) return { ok: false, error: auth.error };

  const parsed = promotionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };

  const payload = {
    slug: parsed.data.slug,
    title: parsed.data.title,
    summary: parsed.data.summary || "",
    description: parsed.data.description || "",
    image_url: parsed.data.image_url || null,
    badge_text: parsed.data.badge_text || null,
    bonus_amount: parsed.data.bonus_amount,
    code: parsed.data.code || null,
    status: parsed.data.status,
    is_featured: parsed.data.is_featured,
    priority: parsed.data.priority,
    starts_at: parsed.data.starts_at ? new Date(parsed.data.starts_at).toISOString() : null,
    ends_at: parsed.data.ends_at ? new Date(parsed.data.ends_at).toISOString() : null,
    created_by: auth.staff.userId,
  };

  const db = adminDb();
  const result = input.id
    ? await db.from("promotions").update(payload).eq("id", input.id)
    : await db.from("promotions").insert(payload);

  if (result.error) {
    if (isMissingRelation(result.error)) return { ok: false, error: RUN_ADMIN_SQL_HINT };
    return { ok: false, error: result.error.message };
  }

  await writeAudit({
    actorId: auth.staff.userId,
    action: input.id ? "promotion.update" : "promotion.create",
    entityType: "promotion",
    entityId: input.id ?? null,
    after: payload,
  });

  revalidatePromotions();
  return { ok: true, message: "Promotion saved." };
}

export async function deletePromotionAction(id: string): Promise<AdminActionResult> {
  const auth = await authorize(PERMISSION);
  if ("error" in auth) return { ok: false, error: auth.error };

  const { error } = await adminDb().from("promotions").delete().eq("id", id);
  if (error) {
    if (isMissingRelation(error)) return { ok: false, error: RUN_ADMIN_SQL_HINT };
    return { ok: false, error: error.message };
  }

  await writeAudit({ actorId: auth.staff.userId, action: "promotion.delete", entityType: "promotion", entityId: id });
  revalidatePromotions();
  return { ok: true, message: "Promotion deleted." };
}
