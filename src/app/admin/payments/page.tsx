import type { Metadata } from "next";
import { AdminModulePlaceholder } from "@/components/admin/admin-module-placeholder";

export const metadata: Metadata = { title: "Payment Methods" };

export default function AdminPaymentsPage() {
  return (
    <AdminModulePlaceholder
      title="Payment Methods"
      description="Deposit payment method configuration."
    />
  );
}
