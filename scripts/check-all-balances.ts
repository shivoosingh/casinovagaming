import fs from "fs";
import path from "path";

try {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, "utf8");
    for (const line of envConfig.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx > 0) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
        process.env[key] = val;
      }
    }
  }
} catch (e) {
  console.error("Error reading .env.local:", e);
}

import { JuwaApiClient } from "../src/lib/game-automation/juwa-api";
import { isJuwaApiConfigured } from "../src/lib/game-automation/juwa-api";
import { VegasApiClient } from "../src/lib/game-automation/vegas-api";
import { isVegasApiConfigured } from "../src/lib/game-automation/vegas-api";
import { getCashMachineApiClient } from "../src/lib/game-automation/cashmachine-api";
import { getCashMachineAccountBalance, isCashMachineApiConfigured } from "../src/lib/game-automation/cashmachine-service";
import { getCashFrenzyAccountBalance, isCashFrenzyApiConfigured } from "../src/lib/game-automation/cashfrenzy-service";
import { getGameroomAccountBalance, isGameroomApiConfigured } from "../src/lib/game-automation/gameroom-service";
import { getMrAllInOneAccountBalance, isMrAllInOneApiConfigured } from "../src/lib/game-automation/mrallinone-service";
import { getGameVaultApiClient } from "../src/lib/game-automation/gamevault-api";
import { isGameVaultApiConfigured } from "../src/lib/game-automation/gamevault-service";
import { getMafiaBalanceDirectApi, isMafiaApiConfigured } from "../src/lib/game-automation/mafia-service";
import { OrionStarsApiClient } from "../src/lib/game-automation/orionstars-api";
import { isOrionStarsApiConfigured } from "../src/lib/game-automation/orionstars-api";
import { MilkyWayApiClient } from "../src/lib/game-automation/milkyway-api";
import { isMilkyWayApiConfigured } from "../src/lib/game-automation/milkyway-api";
import { GAMES } from "../src/lib/games";

type Result = {
  game: string;
  slug: string;
  configured: boolean;
  upcoming: boolean;
  status: "OK" | "API_FAIL" | "NOT_CONFIGURED" | "BOT_ONLY";
  detail: string;
};

const PROBE_ACCOUNT = "balance_probe_nonexistent_99";
const ORION_TEST_ACCOUNT = "os_c974b2fb";
const MILKY_TEST_ACCOUNT = "hackknow";

async function probeJuwa(): Promise<Result> {
  const slug = "juwa";
  if (!isJuwaApiConfigured()) {
    return { game: "Juwa", slug, configured: false, upcoming: false, status: "NOT_CONFIGURED", detail: "No credentials" };
  }
  try {
    const client = new JuwaApiClient();
    const agentBal = await client.getAgentBalance();
    return {
      game: "Juwa",
      slug,
      configured: true,
      upcoming: false,
      status: "OK",
      detail: `API OK — agent balance $${agentBal.toFixed(2)} (player lookup ready)`,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { game: "Juwa", slug, configured: true, upcoming: false, status: "API_FAIL", detail: msg };
  }
}

async function probeVegas(): Promise<Result> {
  const slug = "vegas-sweeps";
  if (!isVegasApiConfigured()) {
    return { game: "Vegas Sweeps", slug, configured: false, upcoming: false, status: "NOT_CONFIGURED", detail: "No credentials" };
  }
  try {
    const client = new VegasApiClient();
    const agentBal = await client.getAgentBalance();
    return {
      game: "Vegas Sweeps",
      slug,
      configured: true,
      upcoming: false,
      status: "OK",
      detail: `API OK — agent balance $${agentBal.toFixed(2)} (player lookup ready)`,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { game: "Vegas Sweeps", slug, configured: true, upcoming: false, status: "API_FAIL", detail: msg };
  }
}

async function probeLayui(
  game: string,
  slug: string,
  configured: boolean,
  fn: (u: string) => Promise<{ balance: number; isGame?: boolean }>
): Promise<Result> {
  if (!configured) {
    return { game, slug, configured: false, upcoming: false, status: "NOT_CONFIGURED", detail: "No credentials" };
  }
  try {
    const info = await fn(PROBE_ACCOUNT);
    return { game, slug, configured: true, upcoming: false, status: "OK", detail: `$${info.balance}${info.isGame ? " (in game)" : ""}` };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/not found|no player|invalid|不存在|player.*not/i.test(msg)) {
      return { game, slug, configured: true, upcoming: false, status: "OK", detail: `API OK — player lookup works (${msg.slice(0, 70)})` };
    }
    return { game, slug, configured: true, upcoming: false, status: "API_FAIL", detail: msg };
  }
}

async function probeCashMachineLogin(): Promise<Result> {
  const slug = "cash-machine";
  if (!isCashMachineApiConfigured()) {
    return { game: "Cash Machine", slug, configured: false, upcoming: false, status: "NOT_CONFIGURED", detail: "No credentials" };
  }
  try {
    const client = getCashMachineApiClient();
    await client.login();
    const info = await getCashMachineAccountBalance(PROBE_ACCOUNT);
    return { game: "Cash Machine", slug, configured: true, upcoming: false, status: "OK", detail: `Login OK — probe balance $${info.balance}` };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/not found|no player|invalid|不存在/i.test(msg)) {
      return { game: "Cash Machine", slug, configured: true, upcoming: false, status: "OK", detail: `API OK — player lookup works (${msg.slice(0, 70)})` };
    }
    return { game: "Cash Machine", slug, configured: true, upcoming: false, status: "API_FAIL", detail: msg };
  }
}

async function probeGameVault(): Promise<Result> {
  const slug = "game-vault";
  if (!isGameVaultApiConfigured()) {
    return { game: "Game Vault", slug, configured: false, upcoming: false, status: "NOT_CONFIGURED", detail: "No credentials" };
  }
  try {
    const client = getGameVaultApiClient();
    const res = await client.getAgentBalance();
    if (res.code !== 0) {
      return { game: "Game Vault", slug, configured: true, upcoming: false, status: "API_FAIL", detail: `Agent balance error [${res.code}]: ${res.msg}` };
    }
    const agentBal = parseFloat(res.data?.agent_balance || "0");
    return {
      game: "Game Vault",
      slug,
      configured: true,
      upcoming: false,
      status: "OK",
      detail: `API OK — agent balance $${agentBal.toFixed(2)} (player lookup ready)`,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { game: "Game Vault", slug, configured: true, upcoming: false, status: "API_FAIL", detail: msg };
  }
}

async function probeMafia(): Promise<Result> {
  const slug = "mafia";
  if (!isMafiaApiConfigured()) {
    return { game: "Mafia", slug, configured: false, upcoming: false, status: "NOT_CONFIGURED", detail: "No credentials" };
  }
  const res = await getMafiaBalanceDirectApi(PROBE_ACCOUNT);
  if (res.success) return { game: "Mafia", slug, configured: true, upcoming: false, status: "OK", detail: `$${res.balance}` };
  const msg = res.message || "";
  if (/not found|no player/i.test(msg)) {
    return { game: "Mafia", slug, configured: true, upcoming: false, status: "OK", detail: `API OK — player lookup works (${msg.slice(0, 70)})` };
  }
  return { game: "Mafia", slug, configured: true, upcoming: false, status: "API_FAIL", detail: msg };
}

async function probeOrion(account: string): Promise<Result> {
  const slug = "orion-stars";
  if (!isOrionStarsApiConfigured()) {
    return { game: "Orion Stars", slug, configured: false, upcoming: false, status: "NOT_CONFIGURED", detail: "No credentials" };
  }
  try {
    const client = new OrionStarsApiClient();
    const info = await client.queryInfo(account);
    const bal = Number(info.userBalance ?? info.userbalance ?? 0);
    return {
      game: "Orion Stars",
      slug,
      configured: true,
      upcoming: false,
      status: "OK",
      detail: `${account} balance $${bal.toFixed(2)}`,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { game: "Orion Stars", slug, configured: true, upcoming: false, status: "API_FAIL", detail: msg };
  }
}

async function probeMilky(account: string): Promise<Result> {
  const slug = "milky-way";
  if (!isMilkyWayApiConfigured()) {
    return { game: "Milky Way", slug, configured: false, upcoming: false, status: "NOT_CONFIGURED", detail: "No credentials" };
  }
  try {
    const client = new MilkyWayApiClient();
    const info = await client.queryInfo(account);
    const bal = Number(info.userBalance ?? info.userbalance ?? 0);
    return {
      game: "Milky Way",
      slug,
      configured: true,
      upcoming: false,
      status: "OK",
      detail: `${account} balance $${bal.toFixed(2)}`,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { game: "Milky Way", slug, configured: true, upcoming: false, status: "API_FAIL", detail: msg };
  }
}

async function main() {
  const results: Result[] = [];

  results.push(await probeJuwa());
  results.push(await probeVegas());
  results.push(await probeCashMachineLogin());
  results.push(
    await probeLayui("Cash Frenzy", "cash-frenzy", isCashFrenzyApiConfigured(), getCashFrenzyAccountBalance)
  );
  results.push(await probeLayui("Gameroom", "gameroom", isGameroomApiConfigured(), getGameroomAccountBalance));
  results.push(
    await probeLayui("MR All-in-One", "mr-all-in-one", isMrAllInOneApiConfigured(), getMrAllInOneAccountBalance)
  );
  results.push(await probeGameVault());
  results.push(await probeMafia());
  results.push(await probeOrion(ORION_TEST_ACCOUNT));
  results.push(await probeMilky(MILKY_TEST_ACCOUNT));

  for (const g of GAMES) {
    if (results.some((r) => r.slug === g.slug)) continue;
    if (g.upcoming) {
      results.push({
        game: g.name,
        slug: g.slug,
        configured: false,
        upcoming: true,
        status: "BOT_ONLY",
        detail: "Upcoming / no API — balance check not available",
      });
    }
  }

  console.log("\n=== Real-time balance check status ===\n");
  for (const r of results.sort((a, b) => a.game.localeCompare(b.game))) {
    const icon =
      r.status === "OK" ? "✅" : r.status === "API_FAIL" ? "❌" : r.status === "NOT_CONFIGURED" ? "⚠️" : "🔒";
    console.log(`${icon} ${r.game} (${r.slug})`);
    console.log(`   ${r.detail}`);
  }

  const ok = results.filter((r) => r.status === "OK").length;
  const fail = results.filter((r) => r.status === "API_FAIL").length;
  console.log(`\nSummary: ${ok} working, ${fail} failing, ${results.length} total checked`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
