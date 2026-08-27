import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { CashMachineApiClient } from "../src/lib/game-automation/cashmachine-api";

// Simple env file loader without external dependencies
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPaths = [
  path.resolve(__dirname, "../.env.local"),
  path.resolve(__dirname, "../.env"),
  path.resolve(__dirname, "../workers/cashmachine-bot/.env"),
];

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx > 0) {
          const key = trimmed.slice(0, eqIdx).trim();
          const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    }
  }
}

async function main() {
  console.log("==========================================");
  console.log(" Testing CashMachine777 Direct REST API");
  console.log("==========================================");

  const username = process.env.CASHMACHINE_AGENT_USERNAME || process.env.CASHMACHINE_USERNAME;
  const password = process.env.CASHMACHINE_AGENT_PASSWORD || process.env.CASHMACHINE_PASSWORD;

  if (!username || !password) {
    console.error("❌ ERROR: CASHMACHINE_AGENT_USERNAME and CASHMACHINE_AGENT_PASSWORD environment variables are required.");
    console.error("Please add them to .env.local or workers/cashmachine-bot/.env");
    process.exit(1);
  }

  console.log(`Connecting to CashMachine API as agent: '${username}'...`);
  const api = new CashMachineApiClient({ username, password });

  try {
    // 1. Login
    console.log("\n[1/6] Testing Store Login (POST /api/agent/login)...");
    const token = await api.login();
    console.log(`✅ Login successful! Token acquired: ${token.slice(0, 25)}...`);

    // 2. Player List
    console.log("\n[2/6] Fetching Player List (GET /api/player/playerList)...");
    const playerList = await api.getPlayerList(5, 1);
    console.log(`✅ Query successful! Found ${playerList.count} total players.`);
    if (playerList.data && playerList.data.length > 0) {
      console.log("First player preview:", playerList.data[0]);
    } else {
      console.log("No players found in account yet.");
    }

    // 3. Score Query / Player lookup
    if (playerList.data && playerList.data.length > 0) {
      const firstPlayer = playerList.data[0];
      console.log(`\n[3/6] Fetching Score for Player '${firstPlayer.Account}' (ID: ${firstPlayer.id})...`);
      const score = await api.getPlayerScore(firstPlayer.id);
      console.log(`✅ Score fetched: balance = ${score.data.balance}, in_game = ${score.data.is_game}`);
    } else {
      console.log("\n[3/6] Skipping score check (no existing players).");
    }

    console.log("\n==========================================");
    console.log(" 🎉 CashMachine API Integration Verified Successfully!");
    console.log("==========================================");
  } catch (err: any) {
    console.error("\n❌ API Test Failed:", err.message || err);
    process.exit(1);
  }
}

main();
