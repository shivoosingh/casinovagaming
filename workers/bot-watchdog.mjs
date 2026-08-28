import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT_ENV = path.join(ROOT_DIR, ".env");
const LOCK_PATH = path.join(ROOT_DIR, ".login.lock");

const BOTS = [
  { name: "juwa-bot", dir: "juwa-bot" },
  { name: "vegas-bot", dir: "vegas-bot" },
  { name: "gamevault-bot", dir: "gamevault-bot" },
  { name: "gameroom-bot", dir: "gameroom-bot" },
  { name: "cashmachine-bot", dir: "cashmachine-bot" },
  { name: "mr-all-in-one-bot", dir: "mr-all-in-one-bot" },
  { name: "mafia-bot", dir: "mafia-bot" },
  { name: "cash-frenzy-bot", dir: "cash-frenzy-bot" },
];

const isWin = process.platform === "win32";
/** @type {Map<string, import("child_process").ChildProcess>} */
const processes = new Map();

function parseEnvFile(filePath) {
  const env = {};
  if (!fs.existsSync(filePath)) return env;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    let value = trimmed.slice(eq + 1);
    if (
      (value.startsWith('"') && value.endsWith('"') && value.length >= 2) ||
      (value.startsWith("'") && value.endsWith("'") && value.length >= 2)
    ) {
      value = value.slice(1, -1);
    }
    env[trimmed.slice(0, eq).trim()] = value;
  }
  return env;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

const sharedEnv = parseEnvFile(ROOT_ENV);

/** Max time to wait for one bot's first login before starting the next. */
const LOGIN_TURN_MS = Number(sharedEnv.BOT_LOGIN_TURN_MS ?? 35_000);
const LOGIN_GAP_MS = Number(sharedEnv.BOT_LOGIN_GAP_MS ?? 150);
/** After first pass, re-focus CAPTCHA on bots that failed to log in. */
const REPAIR_ROUNDS = Math.max(0, Number(sharedEnv.BOT_REPAIR_ROUNDS ?? 3));

const cdpEnv = {
  JUWA_CDP_URL: "http://127.0.0.1:9222",
  VEGAS_CDP_URL: "http://127.0.0.1:9222",
  GAMEVAULT_CDP_URL: "http://127.0.0.1:9222",
  GAMEROOM_CDP_URL: "http://127.0.0.1:9222",
  CASHMACHINE_CDP_URL: "http://127.0.0.1:9222",
  MRALLINONE_CDP_URL: "http://127.0.0.1:9222",
  MAFIA_CDP_URL: "http://127.0.0.1:9222",
  CASHFRENZY_CDP_URL: "http://127.0.0.1:9222",
  JUWA_HEADLESS: "false",
  VEGAS_HEADLESS: "false",
  GAMEVAULT_HEADLESS: "false",
  GAMEROOM_HEADLESS: "false",
  CASHMACHINE_HEADLESS: "false",
  MRALLINONE_HEADLESS: "false",
  MAFIA_HEADLESS: "false",
  CASHFRENZY_HEADLESS: "false",
  CAPTCHA_AUTO: sharedEnv.CAPTCHA_AUTO ?? "true",
  CAPTCHA_MAX_RETRIES: sharedEnv.CAPTCHA_MAX_RETRIES ?? "3",
  CAPTCHA_SOLVER: sharedEnv.CAPTCHA_SOLVER ?? "2captcha",
  CAPTCHA_PREFER_API: sharedEnv.CAPTCHA_PREFER_API ?? "true",
  CAPTCHA_POLL_MS: sharedEnv.CAPTCHA_POLL_MS ?? "1000",
  CAPTCHA_OCR: "false",
  CAPTCHA_MANUAL_TIMEOUT_MS: sharedEnv.CAPTCHA_MANUAL_TIMEOUT_MS ?? "0",
  // Always serialize CAPTCHA (failed bots wait their turn instead of fighting Chrome)
  SKIP_LOGIN_LOCK: sharedEnv.SKIP_LOGIN_LOCK ?? "0",
  BOT_DEBUG_SCREENSHOTS: "false",
  BOT_WAIT_SCALE: sharedEnv.BOT_WAIT_SCALE ?? "0.3",
  ...(sharedEnv.CAPTCHA_API_KEY ? { CAPTCHA_API_KEY: sharedEnv.CAPTCHA_API_KEY } : {}),
  ...(sharedEnv.SUPABASE_URL ? { SUPABASE_URL: sharedEnv.SUPABASE_URL } : {}),
  ...(sharedEnv.NEXT_PUBLIC_SUPABASE_URL
    ? { NEXT_PUBLIC_SUPABASE_URL: sharedEnv.NEXT_PUBLIC_SUPABASE_URL }
    : {}),
  ...(sharedEnv.SUPABASE_SERVICE_ROLE_KEY
    ? { SUPABASE_SERVICE_ROLE_KEY: sharedEnv.SUPABASE_SERVICE_ROLE_KEY }
    : {}),
  SESSION_CHECK_MS: sharedEnv.SESSION_CHECK_MS ?? "300000",
  SESSION_RETRY_MS: sharedEnv.SESSION_RETRY_MS ?? "45000",
  SESSION_KEEPER: sharedEnv.SESSION_KEEPER ?? "true",
  BOT_POLL_MS: sharedEnv.BOT_POLL_MS ?? "3000",
  BOT_SLOWMO: sharedEnv.BOT_SLOWMO ?? "0",
};

function clearLoginLock() {
  try {
    if (fs.existsSync(LOCK_PATH)) fs.unlinkSync(LOCK_PATH);
  } catch {
    /* ignore */
  }
}

function wireRestart(bot, child) {
  child.on("exit", (code, signal) => {
    // Removed from map = intentional stop (repair) — do not auto-restart
    if (!processes.has(bot.name)) return;
    console.warn(
      `[WATCHDOG] ${bot.name} exited code=${code} signal=${signal}. Restarting in 5s...`
    );
    processes.delete(bot.name);
    setTimeout(() => {
      void startBot(bot, { waitForLogin: false });
    }, 5000);
  });

  child.on("error", (err) => {
    console.error(`[WATCHDOG] Error starting ${bot.name}:`, err.message);
  });
}

/**
 * Stop a bot without triggering crash auto-restart (for repair restarts).
 */
async function stopBot(bot) {
  const child = processes.get(bot.name);
  if (!child) return;
  processes.delete(bot.name);
  try {
    child.kill();
  } catch {
    /* ignore */
  }
  await sleep(900);
  try {
    if (!child.killed) child.kill("SIGKILL");
  } catch {
    /* ignore */
  }
  await sleep(400);
}

/**
 * Start one bot. If waitForLogin, block until Session ready / NOT ready / timeout.
 */
function startBot(bot, { waitForLogin }) {
  console.log(`[WATCHDOG] Starting ${bot.name}...`);

  const botDir = path.resolve(ROOT_DIR, bot.dir);
  const command = isWin ? "cmd.exe" : "npx";
  const args = isWin ? ["/c", "npx", "tsx", "src/index.ts"] : ["tsx", "src/index.ts"];

  const child = spawn(command, args, {
    cwd: botDir,
    stdio: waitForLogin ? ["ignore", "pipe", "pipe"] : "inherit",
    env: { ...process.env, ...sharedEnv, ...cdpEnv },
  });

  processes.set(bot.name, child);
  wireRestart(bot, child);

  if (!waitForLogin) return Promise.resolve("started");

  return new Promise((resolve) => {
    let settled = false;
    const finish = (reason) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      console.log(`[WATCHDOG] ${bot.name} login turn done (${reason})`);
      resolve(reason);
    };

    const timer = setTimeout(() => finish("timeout"), LOGIN_TURN_MS);

    const onData = (buf) => {
      const text = buf.toString();
      process.stdout.write(`[${bot.name}] ${text}`);

      // Failures first — never treat "Session NOT ready" as success
      if (
        /Session NOT ready|Session issue \(startup\)|falling back to manual|manual wait disabled|could not read CAPTCHA|Auto-relogin failed/i.test(
          text
        )
      ) {
        finish("fail-fast");
        return;
      }
      if (
        /\bSession ready\b/i.test(text) ||
        /already logged in — skip|already authenticated/i.test(text)
      ) {
        finish("ready");
        return;
      }
      if (/Login lock timeout|Fatal:/i.test(text)) {
        finish("error");
      }
    };

    child.stdout?.on("data", onData);
    child.stderr?.on("data", onData);
  });
}

async function loginTurn(bot, label) {
  console.log(`\n>>> ${label}: ${bot.name} <<<\n`);
  const reason = await startBot(bot, { waitForLogin: true });
  await sleep(LOGIN_GAP_MS);
  return reason;
}

async function bootAllSequential() {
  clearLoginLock();
  console.log("==========================================");
  console.log("CASINOVA BOT WATCHDOG");
  console.log("Unified Chrome — all bots on port 9222");
  console.log("PASS 1: try every game once (don't block forever on one)");
  console.log(`PASS 2: REPAIR — priority CAPTCHA focus on bots still not logged in (${REPAIR_ROUNDS} rounds)`);
  console.log(`Max ${LOGIN_TURN_MS / 1000}s per turn`);
  if (sharedEnv.CAPTCHA_API_KEY) {
    console.log(`CAPTCHA: ${sharedEnv.CAPTCHA_SOLVER ?? "2captcha"} API key loaded`);
  } else {
    console.warn("WARNING: CAPTCHA_API_KEY not found in workers/.env");
  }
  console.log("==========================================");

  /** @type {typeof BOTS} */
  const needsRepair = [];

  for (let i = 0; i < BOTS.length; i++) {
    const bot = BOTS[i];
    const reason = await loginTurn(bot, `LOGIN ${i + 1}/${BOTS.length}`);
    if (reason === "ready") {
      console.log(`[WATCHDOG] OK ${bot.name} logged in`);
    } else {
      console.log(`[WATCHDOG] FAIL ${bot.name} (${reason}) — queued for priority repair`);
      needsRepair.push(bot);
    }
  }

  for (let round = 1; round <= REPAIR_ROUNDS && needsRepair.length > 0; round++) {
    console.log("\n==========================================");
    console.log(
      `REPAIR ROUND ${round}/${REPAIR_ROUNDS} — priority: ${needsRepair.map((b) => b.name).join(", ")}`
    );
    console.log("==========================================");

    const stillDown = [];
    for (const bot of needsRepair) {
      await stopBot(bot);
      clearLoginLock();
      const reason = await loginTurn(bot, `REPAIR ${round}/${REPAIR_ROUNDS}`);
      if (reason === "ready") {
        console.log(`[WATCHDOG] OK ${bot.name} repaired / logged in`);
      } else {
        console.log(`[WATCHDOG] FAIL ${bot.name} still not logged in (${reason})`);
        stillDown.push(bot);
      }
    }
    needsRepair.length = 0;
    needsRepair.push(...stillDown);
  }

  if (needsRepair.length > 0) {
    console.warn(
      `\n[WATCHDOG] Still not logged in: ${needsRepair.map((b) => b.name).join(", ")}`
    );
    console.warn(
      "[WATCHDOG] Those bots keep priority session retries in background (~45s) until logged in\n"
    );
  } else {
    console.log("\n[WATCHDOG] All bots logged in\n");
  }

  console.log("[WATCHDOG] Watching for crashes...\n");
}

process.on("SIGINT", () => {
  console.log("[WATCHDOG] Stopping all bot workers gracefully...");
  for (const [name, child] of processes.entries()) {
    processes.delete(name);
    child.kill();
  }
  clearLoginLock();
  process.exit(0);
});

bootAllSequential().catch((err) => {
  console.error("[WATCHDOG] Fatal boot error:", err);
  process.exit(1);
});
