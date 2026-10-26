import { KycPageClient } from "@/components/dashboard/kyc-page-client";
import { getPlayerKYCStatus } from "@/lib/actions/kyc-actions";

export default async function DashboardKycPage() {
  const status = await getPlayerKYCStatus();
  return <KycPageClient initialStatus={status} />;
}
