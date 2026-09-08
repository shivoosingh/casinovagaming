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

import { FireKirinApiClient } from "../src/lib/game-automation/firekirin-api";

const direct = process.argv.includes("--direct");

async function main() {
  const client = new FireKirinApiClient(direct ? { proxyUrl: null } : {});
  const session = await client.getValidSession();
  console.log("LOGIN OK | agent balance:", client.lastAgentBalance);
  console.log("agentKey:", session.agentKey.slice(0, 8) + "...");
  console.log("proxy:", direct ? "DIRECT" : "ENABLED");
}

main().catch((e) => {
  console.error("FAIL:", e.message);
  process.exit(1);
});
