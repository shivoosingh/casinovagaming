import type { Metadata } from "next";
import Link from "next/link";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/data/admin";

export const metadata: Metadata = { title: "Roles & Permissions" };

export default async function AdminRolesPage() {
  await requirePermission("users.roles");
  const supabase = await createClient();

  const { data: admins } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, created_at")
    .eq("role", "admin")
    .order("created_at", { ascending: true });

  const rows = admins ?? [];

  return (
    <div className="mx-auto max-w-4xl">
      <AdminPageHeader
        title="Roles & Permissions"
        description="Casinova currently uses the legacy profiles.role column. Full RBAC (user_roles) is available when those tables are seeded."
      />

      <div className="mb-6 rounded-2xl border border-amber-500/25 bg-amber-500/5 p-5">
        <h2 className="font-semibold text-amber-200">Legacy admin model</h2>
        <p className="mt-2 text-sm text-slate-400">
          Staff access is granted when <code className="text-violet-200">profiles.role</code> is set
          to <code className="text-violet-200">admin</code>. The admin layout also supports Spinora-style
          RBAC tables (<code className="text-violet-200">roles</code>,{" "}
          <code className="text-violet-200">permissions</code>,{" "}
          <code className="text-violet-200">user_roles</code>) when present — legacy admins receive
          super-admin access automatically.
        </p>
        <p className="mt-2 text-sm text-slate-400">
          Promote or demote users from{" "}
          <Link href="/admin/users" className="text-violet-300 underline">
            User Management
          </Link>
          .
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-violet-400/25 bg-[rgba(18,14,34,0.72)]">
        <div className="border-b border-violet-500/20 px-4 py-3">
          <p className="text-sm font-semibold text-white">
            Admin accounts ({rows.length})
          </p>
        </div>
        {rows.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-400">
            No admin profiles found. Set role=admin on a profile in Supabase or via User Management.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-violet-500/20 text-[11px] uppercase tracking-wider text-violet-300/70">
                <tr>
                  <th className="px-4 py-3 font-bold">Name</th>
                  <th className="px-4 py-3 font-bold">Email</th>
                  <th className="px-4 py-3 font-bold">Role</th>
                  <th className="px-4 py-3 text-right font-bold">Since</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => (
                  <tr key={a.id} className="border-b border-white/[0.04]">
                    <td className="px-4 py-3 font-medium text-white">
                      {a.full_name || "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-400">{a.email}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-xs font-bold uppercase text-violet-200">
                        {a.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-slate-500">
                      {new Date(a.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
