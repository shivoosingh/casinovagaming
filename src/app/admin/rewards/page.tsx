import type { Metadata } from "next";
import { AdminModulePlaceholder } from "@/components/admin/admin-module-placeholder";

export const metadata: Metadata = { title: "Rewards" };

export default function AdminRewardsPage() {
  return (
    <AdminModulePlaceholder
      title="Rewards"
      description="Reward rules and grant configuration."
    />
  );
}
