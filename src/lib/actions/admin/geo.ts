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

const PERMISSION = "cms.manage";

function revalidateGeo() {
  revalidatePath("/admin/geo");
}

const stateSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens"),
  name: z.string().trim().min(2).max(80),
  abbr: z.string().trim().toUpperCase().length(2, "Abbreviation must be 2 letters"),
  hero_lede: z.string().trim().max(2000).optional().default(""),
  meta_description: z.string().trim().max(400).optional().default(""),
  sort_order: z.coerce.number().int().default(0),
  is_active: z.boolean(),
});

export async function upsertGeoStateAction(
  input: z.infer<typeof stateSchema> & { id?: string }
): Promise<AdminActionResult> {
  const auth = await authorize(PERMISSION);
  if ("error" in auth) return { ok: false, error: auth.error };

  const parsed = stateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };

  const db = adminDb();
  const result = input.id
    ? await db.from("geo_states").update(parsed.data).eq("id", input.id)
    : await db.from("geo_states").insert(parsed.data);

  if (result.error) {
    if (isMissingRelation(result.error)) return { ok: false, error: RUN_ADMIN_SQL_HINT };
    return { ok: false, error: result.error.message };
  }

  await writeAudit({
    actorId: auth.staff.userId,
    action: input.id ? "geo_state.update" : "geo_state.create",
    entityType: "geo_state",
    entityId: input.id ?? null,
    after: parsed.data,
  });

  revalidateGeo();
  return { ok: true, message: "State saved." };
}

export async function deleteGeoStateAction(id: string): Promise<AdminActionResult> {
  const auth = await authorize(PERMISSION);
  if ("error" in auth) return { ok: false, error: auth.error };

  const { error } = await adminDb().from("geo_states").delete().eq("id", id);
  if (error) {
    if (isMissingRelation(error)) return { ok: false, error: RUN_ADMIN_SQL_HINT };
    return { ok: false, error: error.message };
  }

  await writeAudit({ actorId: auth.staff.userId, action: "geo_state.delete", entityType: "geo_state", entityId: id });
  revalidateGeo();
  return { ok: true, message: "State deleted." };
}

const citySchema = z.object({
  state_id: z.string().uuid(),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens"),
  name: z.string().trim().min(2).max(80),
  description_snippet: z.string().trim().max(400).optional().default(""),
  sort_order: z.coerce.number().int().default(0),
  is_active: z.boolean(),
});

export async function upsertGeoCityAction(
  input: z.infer<typeof citySchema> & { id?: string }
): Promise<AdminActionResult> {
  const auth = await authorize(PERMISSION);
  if ("error" in auth) return { ok: false, error: auth.error };

  const parsed = citySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };

  const db = adminDb();
  const result = input.id
    ? await db.from("geo_cities").update(parsed.data).eq("id", input.id)
    : await db.from("geo_cities").insert(parsed.data);

  if (result.error) {
    if (isMissingRelation(result.error)) return { ok: false, error: RUN_ADMIN_SQL_HINT };
    return { ok: false, error: result.error.message };
  }

  await writeAudit({
    actorId: auth.staff.userId,
    action: input.id ? "geo_city.update" : "geo_city.create",
    entityType: "geo_city",
    entityId: input.id ?? null,
    after: parsed.data,
  });

  revalidateGeo();
  return { ok: true, message: "City saved." };
}

export async function deleteGeoCityAction(id: string): Promise<AdminActionResult> {
  const auth = await authorize(PERMISSION);
  if ("error" in auth) return { ok: false, error: auth.error };

  const { error } = await adminDb().from("geo_cities").delete().eq("id", id);
  if (error) {
    if (isMissingRelation(error)) return { ok: false, error: RUN_ADMIN_SQL_HINT };
    return { ok: false, error: error.message };
  }

  await writeAudit({ actorId: auth.staff.userId, action: "geo_city.delete", entityType: "geo_city", entityId: id });
  revalidateGeo();
  return { ok: true, message: "City deleted." };
}
