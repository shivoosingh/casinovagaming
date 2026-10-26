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
import { OrionStarsApiClient } from "../src/lib/game-automation/orionstars-api";

async function main() {
  const mode = process.argv[2] || "firekirin";

  if (mode === "orion") {
    const client = new OrionStarsApiClient();
    const session = await client.getValidSession();
    console.log("ORION OK | balance:", client.lastAgentBalance, "| key:", session.agentKey.slice(0, 8));
    return;
  }

  if (mode === "direct") {
    const client = new FireKirinApiClient({ proxyUrl: null });
    const session = await client.getValidSession();
    console.log("FIRE KIRIN DIRECT OK | balance:", client.lastAgentBalance, "| key:", session.agentKey.slice(0, 8));
    return;
  }

  const client = new FireKirinApiClient();
  const session = await client.getValidSession();
  console.log("FIRE KIRIN PROXY OK | balance:", client.lastAgentBalance, "| key:", session.agentKey.slice(0, 8));
}

main().catch((e) => {
  console.error("FAIL:", e.message);
  process.exit(1);
});
