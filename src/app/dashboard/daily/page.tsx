import { DailyPageClient } from "@/components/dashboard/daily-page-client";
import { getDailyStatus } from "@/lib/rewards/daily";

export default async function DailyRewardsPage() {
  const status = await getDailyStatus();
  if ("error" in status) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#0d0d1f] p-6 text-sm text-[#6b6d8f]">
        {status.error}
      </div>
    );
  }
  return <DailyPageClient initial={status} />;
}
