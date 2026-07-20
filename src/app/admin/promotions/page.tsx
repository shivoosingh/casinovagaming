import type { Metadata } from "next";
import { AdminModulePlaceholder } from "@/components/admin/admin-module-placeholder";

export const metadata: Metadata = { title: "Promotions" };

export default function AdminPromotionsPage() {
  return (
    <AdminModulePlaceholder
      title="Promotions"
      description="Create and manage site promotions."
    />
  );
}
