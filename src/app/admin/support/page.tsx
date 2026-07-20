import type { Metadata } from "next";
import { AdminModulePlaceholder } from "@/components/admin/admin-module-placeholder";

export const metadata: Metadata = { title: "Support Tickets" };

export default function AdminSupportPage() {
  return (
    <AdminModulePlaceholder
      title="Support Tickets"
      description="Staff ticket queue and replies."
      relatedHref="/admin/chat"
      relatedLabel="Open Live Chat"
    />
  );
}
