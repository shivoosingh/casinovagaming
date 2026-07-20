import type { Metadata } from "next";
import { AdminModulePlaceholder } from "@/components/admin/admin-module-placeholder";

export const metadata: Metadata = { title: "Newsletters" };

export default function AdminNewslettersPage() {
  return (
    <AdminModulePlaceholder
      title="Newsletters"
      description="Email campaign drafts and sends."
    />
  );
}
