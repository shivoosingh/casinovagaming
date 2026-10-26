import fs from "fs";
import crypto from "crypto";
import https from "https";
import { HttpsProxyAgent } from "https-proxy-agent";
import dns from "dns/promises";

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

const proxy = process.env.GAMEVAULT_PROXY_URL!;

function md5(s: string) {
  return crypto.createHash("md5").update(s).digest("hex").toLowerCase();
}

function post(host: string, port: number, path: string, hostHeader: string) {
  return new Promise<string>((resolve, reject) => {
    const agent = new HttpsProxyAgent(proxy, { rejectUnauthorized: false });
    const req = https.request(
      { hostname: host, port, path, method: "POST", headers: { Host: hostHeader, "User-Agent": "Mozilla/5.0" }, servername: hostHeader, rejectUnauthorized: false, timeout: 25000, agent },
      (res) => {
        let d = "";
        res.on("data", (c) => (d += c));
        res.on("end", () => resolve(d));
      }
    );
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("timeout")); });
    req.end();
  });
}

async function testGame(label: string, host: string, hostHeader: string, agentName: string, pass: string, account: string) {
  const loginTime = Date.now().toString();
  const loginPath = `/ws/service.ashx?action=agentLogin&agentName=${encodeURIComponent(agentName)}&agentPasswd=${md5(pass)}&time=${loginTime}`;
  const loginBody = await post(host, 8033, loginPath, hostHeader);
  const login = JSON.parse(loginBody);
  const agentKey = login.agentkey || login.agentKey;
  console.log(`\n${label} login: code=${login.code} key=${agentKey ? "yes" : "no"}`);
  if (!agentKey) return;

  const time = Date.now().toString();
  const sign = md5((agentName + time + agentKey).toLowerCase());

  for (const [action, extra] of [
    ["queryInfo", `&account=${account}`],
    ["getgamelist", ""],
    ["getGameList", ""],
  ] as const) {
    for (const withKey of [true, false]) {
      let path = `/ws/service.ashx?action=${action}${extra}&agentName=${encodeURIComponent(agentName)}&time=${time}&sign=${sign}`;
      if (withKey) path += `&agentkey=${encodeURIComponent(agentKey)}`;
      const body = await post(host, 8033, path, hostHeader);
      const json = JSON.parse(body);
      if (String(json.code) === "200") {
        console.log(`  OK ${action} key=${withKey}`, JSON.stringify(json).slice(0, 120));
      }
    }
  }

  const failPath = `/ws/service.ashx?action=queryInfo&account=${account}&agentName=${encodeURIComponent(agentName)}&agentkey=${encodeURIComponent(agentKey)}&time=${time}&sign=${sign}`;
  const failBody = await post(host, 8033, failPath, hostHeader);
  const failJson = JSON.parse(failBody);
  console.log(`  queryInfo default: code=${failJson.code} msg=${failJson.msg || "ok"}`);
}

async function main() {
  const mwIp = (await dns.lookup("milkywayapp.xyz")).address;
  console.log("milkywayapp.xyz resolves to", mwIp);

  await testGame("Orion", "34.212.168.0", "orionstars.vip", "Darklord1121", "Re3set@123#", "os_c974b2fb");
  await testGame("Milky hostname", "milkywayapp.xyz", "milkywayapp.xyz", "Darklord1121", "Darklord1121", "hackknow");
  await testGame("Milky IP", mwIp, "milkywayapp.xyz", "Darklord1121", "Darklord1121", "hackknow");
}

main().catch(console.error);
