"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Gamepad2 } from "lucide-react";
import { GameDepositSection } from "@/components/games/game-deposit-section";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { GAMES } from "@/lib/games";
import { cn } from "@/lib/utils";

const PLAYABLE_GAMES = GAMES.filter((g) => !g.upcoming);

export function DepositPageClient() {
  const defaultSlug = PLAYABLE_GAMES[0]?.slug ?? "game-vault";
  const [gameSlug, setGameSlug] = useState(defaultSlug);

  const game = useMemo(
    () => PLAYABLE_GAMES.find((g) => g.slug === gameSlug) ?? PLAYABLE_GAMES[0],
    [gameSlug]
  );

  if (!game) {
    return (
      <div className="text-center py-12 text-[#6b6d8f]">
        No games available for deposits yet.
      </div>
    );
  }

  return (
    <div>
      <DashboardPageHeader
        title="Deposit"
        description="Choose a payment method, send your deposit, then upload a screenshot. We credit your game account after verification."
      />

      <div className="mb-4 rounded-xl border border-[rgba(255,255,255,0.07)] bg-[#0d0d1f] p-4">
        <label htmlFor="deposit-game" className="flex items-center gap-2 text-xs text-[#6b6d8f] mb-2">
          <Gamepad2 className="h-3.5 w-3.5 text-[#c9a84c]" />
          Deposit for game
        </label>
        <select
          id="deposit-game"
          value={game.slug}
          onChange={(e) => setGameSlug(e.target.value)}
          className={cn(
            "w-full rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#13131a] px-4 py-3 text-sm text-[#f0f0f5]",
            "focus:outline-none focus:border-[rgba(201,168,76,0.4)]"
          )}
        >
          {PLAYABLE_GAMES.map((g) => (
            <option key={g.slug} value={g.slug}>
              {g.name}
            </option>
          ))}
        </select>
        <p className="text-[11px] text-[#6b6d8f] mt-2">
          Or open a{" "}
          <Link href="/#games" className="text-[#c9a84c] hover:underline">
            game page
          </Link>{" "}
          to deposit while you browse.{" "}
          <Link href="/dashboard/deposits" className="text-[#c9a84c] hover:underline">
            View my deposit history
          </Link>
        </p>
      </div>

      <GameDepositSection game={game} hideSectionAnchor />
    </div>
  );
}
