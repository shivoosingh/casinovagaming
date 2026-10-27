import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ADMIN_MODULES } from "@/lib/data/admin-modules";

export type StaffContext = {
  userId: string;
  email: string | null;
  roles: string[];
  permissions: Set<string>;
  isSuperAdmin: boolean;
};

/** Any Supabase client that can read profiles + the RBAC tables for one user. */
type RoleReader = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => PromiseLike<{ data: unknown; error: unknown }> & {
        maybeSingle: () => PromiseLike<{ data: unknown; error: unknown }>;
      };
    };
  };
};

const STAFF_ROLE_KEYS = new Set(["super_admin", "admin", "manager", "support_agent", "moderator"]);

async function legacyAdminContext(
  db: RoleReader,
  userId: string,
  email: string | null
): Promise<StaffContext | null> {
  const { data } = await db.from("profiles").select("role").eq("id", userId).maybeSingle();
  const profile = data as { role?: string } | null;

  if (profile?.role !== "admin") return null;

  return {
    userId,
    email,
    roles: ["super_admin"],
    permissions: new Set<string>(),
    isSuperAdmin: true,
  };
}

/**
 * Builds the staff context for one user from whatever client is handed in.
 * Prefers the RBAC tables when the user has rows there; otherwise falls back
 * to profiles.role === "admin" (Casinova / Spinora legacy).
 */
async function resolveStaffContext(db: RoleReader, userId: string, email: string | null): Promise<StaffContext | null> {
  const { data, error: roleError } = await db
    .from("user_roles")
    .select("roles(key, role_permissions(permissions(key)))")
    .eq("user_id", userId);
  const roleRows = (data ?? null) as
    | { roles: { key?: string; role_permissions?: { permissions?: { key: string } | null }[] } | null }[]
    | null;

  if (roleError || !roleRows?.length) {
    return legacyAdminContext(db, userId, email);
  }

  const roles = roleRows.map((r) => r.roles?.key).filter((k): k is string => Boolean(k));

  const isStaff = roles.some((r) => STAFF_ROLE_KEYS.has(r));
  if (!isStaff) {
    return legacyAdminContext(db, userId, email);
  }

  const isSuperAdmin = roles.includes("super_admin");
  const permissions = new Set<string>();
  for (const row of roleRows) {
    for (const rp of row.roles?.role_permissions ?? []) {
      if (rp.permissions?.key) permissions.add(rp.permissions.key);
    }
  }

  return { userId, email, roles, permissions, isSuperAdmin };
}

/** Resolve staff context for the signed-in user (RSC / server actions). */
export const getStaffContext = cache(async (): Promise<StaffContext | null> => {
  const supabase = await createClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  return resolveStaffContext(supabase as unknown as RoleReader, user.id, user.email ?? null);
});

/**
 * Resolve staff context for a user id with no browser session: the Telegram
 * admin bot, which knows only the linked user id. Reads with the service
 * role, so it must only be called after the caller's identity is established
 * (a redeemed link code).
 */
export async function getStaffContextForUserId(userId: string): Promise<StaffContext | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data: profile } = await admin.from("profiles").select("email").eq("id", userId).maybeSingle();
  return resolveStaffContext(admin as unknown as RoleReader, userId, profile?.email ?? null);
}

export async function requireStaff(): Promise<StaffContext> {
  const ctx = await getStaffContext();
  if (!ctx) redirect("/dashboard");
  return ctx;
}

export function can(ctx: StaffContext, permission: string): boolean {
  return ctx.isSuperAdmin || ctx.permissions.has(permission);
}

export async function requirePermission(permission: string): Promise<StaffContext> {
  const ctx = await requireStaff();
  if (!can(ctx, permission)) redirect("/admin");
  return ctx;
}

export { ADMIN_MODULES };
