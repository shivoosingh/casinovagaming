import type { Metadata } from "next";
import { AdminModulePlaceholder } from "@/components/admin/admin-module-placeholder";

export const metadata: Metadata = { title: "Cash-out Payouts" };

export default function AdminPayoutsPage() {
  return (
    <AdminModulePlaceholder
      title="Cash-out Payouts"
      description="Manual cash-out payouts from cashout wallets."
      relatedHref="/admin/transactions"
      relatedLabel="Open Transactions"
    />
  );
}
