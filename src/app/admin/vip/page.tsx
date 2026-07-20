import type { Metadata } from "next";
import { AdminModulePlaceholder } from "@/components/admin/admin-module-placeholder";

export const metadata: Metadata = { title: "VIP Tiers" };

export default function AdminVipPage() {
  return (
    <AdminModulePlaceholder
      title="VIP Tiers"
      description="VIP tier thresholds and benefits."
    />
  );
}
