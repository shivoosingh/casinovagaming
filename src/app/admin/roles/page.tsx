import type { Metadata } from "next";
import { AdminModulePlaceholder } from "@/components/admin/admin-module-placeholder";

export const metadata: Metadata = { title: "Roles & Permissions" };

export default function AdminRolesPage() {
  return (
    <AdminModulePlaceholder
      title="Roles & Permissions"
      description="Staff roles and permission matrix."
    />
  );
}
