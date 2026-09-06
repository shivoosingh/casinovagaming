import { DepositPageClient } from "@/components/dashboard/deposit-page-client";
import { getActivePaymentMethods } from "@/lib/data/payments";

export const dynamic = "force-dynamic";

export default async function DepositPage() {
  const paymentMethods = await getActivePaymentMethods();
  return <DepositPageClient paymentMethods={paymentMethods} />;
}
