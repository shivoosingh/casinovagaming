import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { ADMIN_MODULES } from "@/lib/data/admin-modules";

export type StaffContext = {
  userId: string;
  email: string | null;
  roles: string[];
  permissions: Set<string>;
  isSuperAdmin: boolean;
};

async function legacyAdminContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  email: string | null
): Promise<StaffContext | null> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

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
 * Resolve staff context. Prefers RBAC tables when present; otherwise
 * profiles.role === "admin" (Casinova / Spinora legacy).
 */
export const getStaffContext = cache(async (): Promise<StaffContext | null> => {
  const supabase = await createClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: roleRows, error: roleError } = await supabase
    .from("user_roles")
    .select("roles(key, role_permissions(permissions(key)))")
    .eq("user_id", user.id);

  if (roleError || !roleRows?.length) {
    return legacyAdminContext(supabase, user.id, user.email ?? null);
  }

  const roles = roleRows
    .map((r) => (r.roles as unknown as { key?: string } | null)?.key)
    .filter((k): k is string => Boolean(k));

  const staffKeys = new Set(["super_admin", "admin", "manager", "support_agent", "moderator"]);
  const isStaff = roles.some((r) => staffKeys.has(r));
  if (!isStaff) {
    return legacyAdminContext(supabase, user.id, user.email ?? null);
  }

  const isSuperAdmin = roles.includes("super_admin");
  const permissions = new Set<string>();
  for (const row of roleRows) {
    const role = row.roles as unknown as {
      role_permissions?: { permissions?: { key: string } | null }[];
    } | null;
    for (const rp of role?.role_permissions ?? []) {
      if (rp.permissions?.key) permissions.add(rp.permissions.key);
    }
  }

  return {
    userId: user.id,
    email: user.email ?? null,
    roles,
    permissions,
    isSuperAdmin,
  };
});

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
