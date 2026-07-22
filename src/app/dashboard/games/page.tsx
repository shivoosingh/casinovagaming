import type { Metadata } from "next";
import Link from "next/link";

import { GameAccountsSection, GameJobLog } from "@/components/dashboard/game-accounts";
import { MyGamesLiveRefresh } from "@/components/dashboard/my-games-live-refresh";
import {
  getActiveJobsByGame,
  getMyGameAccounts,
  getMyGameJobLog,
  getMyWalletBalance,
} from "@/lib/data/my-games";
import { SITE_NAME } from "@/lib/constants";

export const metadata: Metadata = { title: `My Games | ${SITE_NAME}` };
export const dynamic = "force-dynamic";

export default async function DashboardGamesPage() {
  const [accounts, walletBalance, activeJobs, jobLog] = await Promise.all([
    getMyGameAccounts(),
    getMyWalletBalance(),
    getActiveJobsByGame(),
    getMyGameJobLog(15),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <MyGamesLiveRefresh />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">My Games</h1>
          <p className="mt-1 text-sm text-slate-400">
            Games where you created an account — open a game to load credits or redeem.
          </p>
        </div>
        <Link
          href="/games"
          className="text-sm font-medium text-fuchsia-300 underline-offset-4 hover:underline"
        >
          Browse games for new accounts →
        </Link>
      </div>

      <GameAccountsSection
        accounts={accounts}
        walletBalance={walletBalance}
        activeJobs={activeJobs}
      />

      <GameJobLog rows={jobLog} />
    </div>
  );
}
