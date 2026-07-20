import type { Metadata } from "next";
import { AdminModulePlaceholder } from "@/components/admin/admin-module-placeholder";

export const metadata: Metadata = { title: "Audit Logs" };

export default function AdminAuditPage() {
  return (
    <AdminModulePlaceholder
      title="Audit Logs"
      description="Immutable admin action history."
    />
  );
}
