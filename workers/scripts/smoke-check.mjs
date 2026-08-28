/**
 * Pre-flight smoke check for all 8 game bots (env, passwords with #, Chrome CDP tabs).
 * Usage: node scripts/smoke-check.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const WORKERS = path.join(ROOT, "..");

const BOTS = [
  { name: "Juwa", dir: "juwa-bot", user: "JUWA_AGENT_USERNAME", pass: "JUWA_AGENT_PASSWORD" },
  { name: "Vegas", dir: "vegas-bot", user: "VEGAS_AGENT_USERNAME", pass: "VEGAS_AGENT_PASSWORD" },
  {
    name: "Game Vault",
    dir: "gamevault-bot",
    user: "GAMEVAULT_AGENT_USERNAME",
    pass: "GAMEVAULT_AGENT_PASSWORD",
  },
  {
    name: "Gameroom",
    dir: "gameroom-bot",
    user: "GAMEROOM_AGENT_USERNAME",
    pass: "GAMEROOM_AGENT_PASSWORD",
  },
  {
    name: "Cash Machine",
    dir: "cashmachine-bot",
    user: "CASHMACHINE_AGENT_USERNAME",
    pass: "CASHMACHINE_AGENT_PASSWORD",
  },
  {
    name: "MR All-in-One",
    dir: "mr-all-in-one-bot",
    user: "MRALLINONE_AGENT_USERNAME",
    pass: "MRALLINONE_AGENT_PASSWORD",
  },
  { name: "Mafia", dir: "mafia-bot", user: "MAFIA_AGENT_USERNAME", pass: "MAFIA_AGENT_PASSWORD" },
  {
    name: "Cash Frenzy",
    dir: "cash-frenzy-bot",
    user: "CASHFRENZY_AGENT_USERNAME",
    pass: "CASHFRENZY_AGENT_PASSWORD",
  },
];

const PANEL_HOSTS = [
  "juwa777.com",
  "lasvegassweeps.com",
  "gamevault999.com",
  "gameroom777.com",
  "cashmachine777.com",
  "mrallinone777.com",
  "mafia77777.com",
  "cashfrenzy777.com",
];

function parseEnv(filePath) {
  const map = new Map();
  if (!fs.existsSync(filePath)) return map;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    const key = t.slice(0, eq).trim();
    let value = t.slice(eq + 1);
    if (
      (value.startsWith('"') && value.endsWith('"') && value.length >= 2) ||
      (value.startsWith("'") && value.endsWith("'") && value.length >= 2)
    ) {
      value = value.slice(1, -1);
    }
    map.set(key, value);
  }
  return map;
}

function hasRealKey(map, key) {
  const v = map.get(key)?.trim();
  return Boolean(v && !v.includes("your_") && v.length > 8);
}

function rawLine(filePath, key) {
  if (!fs.existsSync(filePath)) return "";
  const line = fs
    .readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .find((l) => l.trim().startsWith(`${key}=`));
  return line ? line.trim().slice(key.length + 1) : "";
}

/** What dotenv would load for an unquoted/quoted value. */
function dotenvValue(raw) {
  let value = raw;
  if (
    (value.startsWith('"') && value.endsWith('"') && value.length >= 2) ||
    (value.startsWith("'") && value.endsWith("'") && value.length >= 2)
  ) {
    return value.slice(1, -1);
  }
  const hash = value.indexOf("#");
  if (hash >= 0) return value.slice(0, hash).trimEnd();
  return value;
}

async function chromeMeta() {
  try {
    const version = await fetch("http://127.0.0.1:9222/json/version", {
      signal: AbortSignal.timeout(2500),
    });
    if (!version.ok) return { ok: false, tabs: [] };
    const list = await fetch("http://127.0.0.1:9222/json/list", {
      signal: AbortSignal.timeout(2500),
    });
    const tabs = list.ok ? await list.json() : [];
    return { ok: true, tabs: Array.isArray(tabs) ? tabs : [] };
  } catch {
    return { ok: false, tabs: [] };
  }
}

let pass = 0;
let warn = 0;
let fail = 0;

console.log("\n============================================================");
console.log("  CASINOVA BOT SMOKE CHECK");
console.log("============================================================\n");

const rootEnvPath = path.join(WORKERS, ".env");
if (!fs.existsSync(rootEnvPath)) {
  console.log("  [FAIL] workers/.env missing");
  fail++;
} else {
  console.log("  [OK]   workers/.env exists");
  pass++;
}

const chrome = await chromeMeta();
if (chrome.ok) {
  console.log(`  [OK]   Chrome CDP on 9222 (${chrome.tabs.length} tabs)`);
  pass++;
  const urls = chrome.tabs.map((t) => String(t.url || "")).join(" ");
  for (const host of PANEL_HOSTS) {
    if (urls.includes(host)) {
      console.log(`  [OK]   tab: ${host}`);
      pass++;
    } else {
      console.log(`  [WARN] missing tab: ${host}`);
      warn++;
    }
  }
} else {
  console.log("  [WARN] Chrome not on 9222 — run start-unified-chrome.bat");
  warn++;
}

console.log("");

for (const bot of BOTS) {
  const botDir = path.join(WORKERS, bot.dir);
  const envPath = path.join(botDir, ".env");
  const issues = [];

  if (!fs.existsSync(path.join(botDir, "package.json"))) {
    console.log(`  [FAIL] ${bot.name} — missing folder`);
    fail++;
    continue;
  }

  if (!fs.existsSync(envPath)) {
    console.log(`  [WARN] ${bot.name} — no .env`);
    warn++;
    continue;
  }

  const env = parseEnv(envPath);
  const passRaw = rawLine(envPath, bot.pass);
  const user = (env.get(bot.user) || "").trim();
  const passLoaded = dotenvValue(passRaw);

  if (!hasRealKey(env, "SUPABASE_SERVICE_ROLE_KEY")) issues.push("no Supabase key");
  if (!hasRealKey(env, "CAPTCHA_API_KEY")) issues.push("no CAPTCHA key");
  if (!user) issues.push("no agent user");
  if (!passLoaded) issues.push("no agent pass");
  if (passRaw.includes("#") && !passRaw.trim().startsWith('"') && !passRaw.trim().startsWith("'")) {
    issues.push("password # not quoted");
  }
  if (!fs.existsSync(path.join(botDir, "node_modules"))) issues.push("npm install needed");

  if (issues.length === 0) {
    pass++;
    console.log(`  [OK]   ${bot.name}  user=${user}  passLen=${passLoaded.length}`);
  } else {
    warn++;
    console.log(
      `  [WARN] ${bot.name} — ${issues.join(", ")}  user=${user || "?"} passLen=${passLoaded.length}`
    );
  }
}

console.log("\n============================================================");
console.log(`  SUMMARY: ${pass} passed | ${warn} warnings | ${fail} failed`);
console.log("============================================================\n");

if (fail > 0) process.exit(1);
process.exit(0);
