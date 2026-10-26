"use server";

import { authorize } from "@/lib/actions/admin/core";
import { JuwaApiClient, isJuwaApiConfigured } from "@/lib/game-automation/juwa-api";
import { VegasApiClient, isVegasApiConfigured } from "@/lib/game-automation/vegas-api";
import { GameVaultApiClient } from "@/lib/game-automation/gamevault-api";
import { isGameVaultApiConfigured } from "@/lib/game-automation/gamevault-service";
import { MrAllInOneApiClient, isMrAllInOneApiConfigured } from "@/lib/game-automation/mrallinone-api";
import { GameroomApiClient } from "@/lib/game-automation/gameroom-api";
import { isGameroomApiConfigured } from "@/lib/game-automation/gameroom-service";
import { CashFrenzyApiClient } from "@/lib/game-automation/cashfrenzy-api";
import { isCashFrenzyApiConfigured } from "@/lib/game-automation/cashfrenzy-service";
import { CashMachineApiClient } from "@/lib/game-automation/cashmachine-api";
import { isCashMachineApiConfigured } from "@/lib/game-automation/cashmachine-service";
import { MafiaApiClient, isMafiaApiConfigured } from "@/lib/game-automation/mafia-api";
import { OrionStarsApiClient, isOrionStarsApiConfigured } from "@/lib/game-automation/orionstars-api";
import { MilkyWayApiClient, isMilkyWayApiConfigured } from "@/lib/game-automation/milkyway-api";
import { FireKirinApiClient, isFireKirinApiConfigured } from "@/lib/game-automation/firekirin-api";

export type AgentBalanceRow = {
  game: string;
  coins: number | null;
  error?: string;
};

const PER_GAME_TIMEOUT_MS = 8_000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

async function safeBalance(
  game: string,
  configured: boolean,
  fetchBalance: () => Promise<number>
): Promise<AgentBalanceRow> {
  if (!configured) {
    return { game, coins: null, error: "Not configured" };
  }
  try {
    const coins = await withTimeout(fetchBalance(), PER_GAME_TIMEOUT_MS, game);
    return { game, coins: Number.isFinite(coins) ? coins : 0 };
  } catch (e) {
    return {
      game,
      coins: null,
      error: e instanceof Error ? e.message.slice(0, 120) : "Failed to load",
    };
  }
}

export async function fetchAdminAgentBalances(): Promise<AgentBalanceRow[]> {
  return Promise.all([
    safeBalance("Juwa", isJuwaApiConfigured(), () => new JuwaApiClient().getAgentBalance()),
    safeBalance("Vegas Sweeps", isVegasApiConfigured(), () => new VegasApiClient().getAgentBalance()),
    safeBalance("Game Vault", isGameVaultApiConfigured(), async () => {
      const res = await new GameVaultApiClient().getAgentBalance();
      return parseFloat(String(res.data?.agent_balance ?? "0")) || 0;
    }),
    safeBalance("MR All-in-One", isMrAllInOneApiConfigured(), () =>
      new MrAllInOneApiClient().getAgentBalance()
    ),
    safeBalance("Gameroom", isGameroomApiConfigured(), () => new GameroomApiClient().getAgentBalance()),
    safeBalance("Cash Frenzy", isCashFrenzyApiConfigured(), () =>
      new CashFrenzyApiClient().getAgentBalance()
    ),
    safeBalance("Cash Machine", isCashMachineApiConfigured(), () =>
      new CashMachineApiClient().getAgentBalance()
    ),
    safeBalance("Mafia", isMafiaApiConfigured(), () => new MafiaApiClient().getAgentBalance()),
    safeBalance("Orion Stars", isOrionStarsApiConfigured(), () =>
      new OrionStarsApiClient().getAgentBalance()
    ),
    safeBalance("Milky Way", isMilkyWayApiConfigured(), () => new MilkyWayApiClient().getAgentBalance()),
    safeBalance("Fire Kirin", isFireKirinApiConfigured(), () =>
      new FireKirinApiClient().getAgentBalance()
    ),
  ]);
}

export async function getAdminAgentBalancesAction(): Promise<
  { ok: true; rows: AgentBalanceRow[]; checkedAt: string } | { ok: false; error: string }
> {
  const auth = await authorize("requests.manage");
  if ("error" in auth) {
    return { ok: false, error: auth.error };
  }

  const rows = await fetchAdminAgentBalances();
  return { ok: true, rows, checkedAt: new Date().toISOString() };
}
