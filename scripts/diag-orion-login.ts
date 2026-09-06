import fs from "fs";
for (const line of fs.readFileSync(".env.local", "utf8").split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const eq = t.indexOf("=");
  if (eq === -1) continue;
  const k = t.slice(0, eq).trim();
  let v = t.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
  process.env[k] = v;
}

import { OrionStarsApiClient } from "../src/lib/game-automation/orionstars-api";

async function main() {
  const client = new OrionStarsApiClient();
  const session = await client.getValidSession();
  console.log("Login OK, agentKey:", session.agentKey.slice(0, 8) + "...");
  const info = await client.queryInfo("os_c974b2fb", session);
  console.log("queryInfo:", JSON.stringify(info, null, 2));
}

main().catch((e) => console.error("FAIL:", e.message));
