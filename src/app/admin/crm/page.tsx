import type { Metadata } from "next";
import { AdminModulePlaceholder } from "@/components/admin/admin-module-placeholder";

export const metadata: Metadata = { title: "CRM" };

export default function AdminCrmPage() {
  return (
    <AdminModulePlaceholder
      title="CRM"
      description="Player CRM overview, segments, and engagement signals."
    />
  );
}
