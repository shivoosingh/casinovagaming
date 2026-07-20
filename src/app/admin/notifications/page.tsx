import type { Metadata } from "next";
import { AdminModulePlaceholder } from "@/components/admin/admin-module-placeholder";

export const metadata: Metadata = { title: "Broadcasts" };

export default function AdminNotificationsPage() {
  return (
    <AdminModulePlaceholder
      title="Broadcasts"
      description="Push broadcast notices to players."
      relatedHref="/admin"
      relatedLabel="Back to Overview"
    />
  );
}
