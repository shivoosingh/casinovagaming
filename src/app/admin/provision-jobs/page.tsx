import type { Metadata } from "next";
import { AdminModulePlaceholder } from "@/components/admin/admin-module-placeholder";

export const metadata: Metadata = { title: "Bot Jobs" };

export default function AdminProvisionJobsPage() {
  return (
    <AdminModulePlaceholder
      title="Bot Jobs"
      description="Game account provision / automation queue."
      relatedHref="/admin/game-loads"
      relatedLabel="Open Wallet Loads"
    />
  );
}
