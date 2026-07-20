import "server-only";

import { getStaffContext, can } from "@/lib/data/admin";
import { createAdminClient } from "@/lib/supabase/admin";

export type AdminActionResult =
  | { ok: true; message?: string; id?: string }
  | { ok: false; error: string };

export type AuthorizedStaff = {
  userId: string;
  email: string | null;
};

export async function authorize(
  permission: string
): Promise<{ staff: AuthorizedStaff } | { error: string }> {
  const ctx = await getStaffContext();
  if (!ctx) return { error: "You don't have access to this area." };
  if (!can(ctx, permission)) {
    return { error: "You don't have permission to do that." };
  }
  return { staff: { userId: ctx.userId, email: ctx.email } };
}

/** Soft audit write — ignores missing audit_logs table. */
export async function writeAudit(params: {
  actorId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    if (!admin) return;
    await admin.from("audit_logs").insert({
      actor_id: params.actorId,
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId ?? null,
      before_data: params.before ?? null,
      after_data: params.after ?? null,
    });
  } catch {
    // never abort mutations for audit failure
  }
}

export function adminDb() {
  const client = createAdminClient();
  if (!client) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for admin operations.");
  }
  return client;
}

/** True when a Postgres error means the table/function doesn't exist yet. */
export function isMissingRelation(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (error.code === "42P01" || error.code === "42883") return true;
  const message = error.message ?? "";
  return /relation .* does not exist/i.test(message) || /function .* does not exist/i.test(message);
}

export const RUN_ADMIN_SQL_HINT = "Run supabase/admin-essentials-casinova.sql in the Supabase SQL editor.";
