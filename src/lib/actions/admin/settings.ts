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

const PERMISSION = "settings.manage";

function revalidateSettings() {
  revalidatePath("/admin/settings");
}

const settingSchema = z.object({
  key: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9_]+$/, "Key must be lowercase letters, numbers, and underscores"),
  value: z.string().trim().min(1, "Value is required"),
  description: z.string().trim().max(300).optional().default(""),
});

export async function upsertSiteSettingAction(
  input: z.infer<typeof settingSchema>
): Promise<AdminActionResult> {
  const auth = await authorize(PERMISSION);
  if ("error" in auth) return { ok: false, error: auth.error };

  const parsed = settingSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };

  let value: unknown;
  try {
    value = JSON.parse(parsed.data.value);
  } catch {
    return { ok: false, error: "Value must be valid JSON, e.g. true, 5, \"text\", or {\"a\":1}" };
  }

  const db = adminDb();
  const { error } = await db
    .from("site_settings")
    .upsert(
      { key: parsed.data.key, value, description: parsed.data.description ?? "", updated_by: auth.staff.userId },
      { onConflict: "key" }
    );

  if (error) {
    if (isMissingRelation(error)) return { ok: false, error: RUN_ADMIN_SQL_HINT };
    return { ok: false, error: error.message };
  }

  await writeAudit({
    actorId: auth.staff.userId,
    action: "site_setting.save",
    entityType: "site_setting",
    entityId: parsed.data.key,
    after: value,
  });

  revalidateSettings();
  return { ok: true, message: "Setting saved." };
}

export async function deleteSiteSettingAction(key: string): Promise<AdminActionResult> {
  const auth = await authorize(PERMISSION);
  if ("error" in auth) return { ok: false, error: auth.error };

  const db = adminDb();
  const { error } = await db.from("site_settings").delete().eq("key", key);
  if (error) {
    if (isMissingRelation(error)) return { ok: false, error: RUN_ADMIN_SQL_HINT };
    return { ok: false, error: error.message };
  }

  await writeAudit({
    actorId: auth.staff.userId,
    action: "site_setting.delete",
    entityType: "site_setting",
    entityId: key,
  });

  revalidateSettings();
  return { ok: true, message: "Setting removed." };
}
