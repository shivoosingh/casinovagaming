"use client";

import { useRouter } from "next/navigation";
import { HomeSidebar } from "@/components/home/home-sidebar";
import { DeferredWalletCardLoader } from "@/components/wallet/deferred-wallet-card-loader";
import { AppShell } from "@/components/layout/app-shell";
import { GameLandingClient } from "@/components/games/game-landing-client";
import type { Game } from "@/lib/games";
import type { DepositPaymentMethod } from "@/lib/payments/methods";

interface GamePageShellProps {
  game: Game;
  autoCreate?: boolean;
  walletLoadEnabled?: boolean;
  paymentMethods?: DepositPaymentMethod[];
  initialGameAccount?: {
    game_username: string;
    game_password: string | null;
  } | null;
}

export function GamePageShell({
  game,
  autoCreate,
  walletLoadEnabled,
  paymentMethods,
  initialGameAccount,
}: GamePageShellProps) {
  const router = useRouter();

  return (
    <AppShell
      onSearchClick={() => router.push("/#games")}
      sidebar={
        <HomeSidebar
          activeTab="all"
          onTabChange={() => router.push("/")}
          onSearchClick={() => router.push("/#games")}
          walletSlot={<DeferredWalletCardLoader />}
        />
      }
    >
      <GameLandingClient
        game={game}
        autoCreate={autoCreate}
        walletLoadEnabled={walletLoadEnabled}
        paymentMethods={paymentMethods}
        initialGameAccount={initialGameAccount}
      />
    </AppShell>
  );
}
