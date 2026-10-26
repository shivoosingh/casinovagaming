import fs from "fs";
for (const line of fs.readFileSync(".env.local", "utf8").split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("=");
  if (i < 0) continue;
  process.env[t.slice(0, i).trim()] = t
    .slice(i + 1)
    .trim()
    .replace(/^["']|["']$/g, "");
}

import { MilkyWayApiClient } from "../src/lib/game-automation/milkyway-api";
import { OrionStarsApiClient } from "../src/lib/game-automation/orionstars-api";

const account = process.argv[2] || "hackknow";

async function main() {
  console.log("=== Milky Way ===");
  const mw = new MilkyWayApiClient();
  const mwSession = await mw.getFreshSession();
  console.log("login OK | balance:", mw.lastAgentBalance);
  try {
    const info = await mw.queryInfo(account, mwSession);
    console.log("queryInfo OK:", JSON.stringify(info));
  } catch (e) {
    console.log("queryInfo FAIL:", (e as Error).message);
  }

  console.log("\n=== Orion Stars (compare) ===");
  const os = new OrionStarsApiClient();
  const osSession = await os.getValidSession();
  console.log("login OK | balance:", os.lastAgentBalance);
  try {
    const info = await os.queryInfo("os_c974b2fb", osSession);
    console.log("queryInfo OK | userBalance:", info.userBalance ?? info.userbalance);
  } catch (e) {
    console.log("queryInfo FAIL:", (e as Error).message);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
