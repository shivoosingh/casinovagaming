"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { Button } from "@/components/ui/button";
import { claimDailyLogin, claimSpinMission, type DailyStatus } from "@/lib/rewards/daily";

export function DailyPageClient({ initial }: { initial: DailyStatus }) {
  const [status, setStatus] = useState(initial);
  const [busy, setBusy] = useState<"login" | "spin" | null>(null);

  async function onCheckIn() {
    setBusy("login");
    const result = await claimDailyLogin();
    setBusy(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(`Checked in. +${result.points} VIP points. Streak ${result.streak}.`);
    setStatus((prev) => ({
      ...prev,
      claimedToday: true,
      streak: result.streak,
    }));
  }

  async function onSpinReward() {
    setBusy("spin");
    const result = await claimSpinMission();
    setBusy(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(`Spin mission complete. +${result.points} VIP points.`);
    setStatus((prev) => ({ ...prev, spinRewardClaimed: true }));
  }

  return (
    <div>
      <DashboardPageHeader
        title={
          <span className="flex items-center gap-2">
            <CalendarCheck className="h-7 w-7 text-[#c9a84c]" /> Daily rewards
          </span>
        }
        description="Check in each day and finish a short mission. Rewards are VIP points, added to the tier you already have."
      />

      <div className="grid gap-4 max-w-xl">
        <section className="rounded-2xl border border-white/10 bg-[#0d0d1f] p-6">
          <p className="text-sm text-[#6b6d8f]">Streak</p>
          <p className="text-3xl font-black text-white">{status.streak} day{status.streak === 1 ? "" : "s"}</p>
          <p className="mt-2 text-sm text-[#f0f0f5]">Today&apos;s check-in is +{status.todayPoints} VIP points.</p>
          <Button className="mt-4" disabled={status.claimedToday || busy !== null} onClick={() => void onCheckIn()}>
            {status.claimedToday ? "Checked in today" : busy === "login" ? "Saving…" : "Check in"}
          </Button>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#0d0d1f] p-6">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[#00E5FF]" />
            <h2 className="font-semibold text-white">Today&apos;s mission</h2>
          </div>
          <p className="mt-2 text-sm text-[#6b6d8f]">Spin the daily wheel, then claim +5 VIP points.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href="/spin">Open the wheel</Link>
            </Button>
            <Button disabled={!status.spunToday || status.spinRewardClaimed || busy !== null} onClick={() => void onSpinReward()}>
              {status.spinRewardClaimed ? "Mission claimed" : busy === "spin" ? "Saving…" : "Claim spin reward"}
            </Button>
          </div>
          {!status.spunToday && <p className="mt-3 text-xs text-[#6b6d8f]">Spin once today to unlock the claim.</p>}
        </section>
      </div>
    </div>
  );
}
