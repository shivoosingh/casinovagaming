import fs from "fs";
import crypto from "crypto";
import https from "https";
import { HttpsProxyAgent } from "https-proxy-agent";

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

async function signedCall(label: string, host: string, hostHeader: string, agentName: string, pass: string, action: string, extra = "", withAgentKey = true) {
  const loginTime = Date.now().toString();
  const login = JSON.parse(await post(host, 8033, `/ws/service.ashx?action=agentLogin&agentName=${encodeURIComponent(agentName)}&agentPasswd=${md5(pass)}&time=${loginTime}`, hostHeader));
  const agentKey = login.agentkey || login.agentKey;
  const time = Date.now().toString();
  const sign = md5((agentName + time + agentKey).toLowerCase());
  let path = `/ws/service.ashx?action=${action}${extra}&agentName=${encodeURIComponent(agentName)}&time=${time}&sign=${sign}`;
  if (withAgentKey) path += `&agentkey=${encodeURIComponent(agentKey)}`;
  const body = await post(host, 8033, path, hostHeader);
  console.log(`${label}:`, body.slice(0, 200));
}

async function main() {
  await signedCall("Orion getgamelist WITH key", "34.212.168.0", "orionstars.vip", "Darklord1121", "Re3set@123#", "getgamelist");
  await signedCall("Orion getgamelist NO key", "34.212.168.0", "orionstars.vip", "Darklord1121", "Re3set@123#", "getgamelist", "", false);
  await signedCall("Milky getgamelist WITH key", "milkywayapp.xyz", "milkywayapp.xyz", "Darklord1121", "Darklord1121", "getgamelist");
  await signedCall("Milky getgamelist NO key", "milkywayapp.xyz", "milkywayapp.xyz", "Darklord1121", "Darklord1121", "getgamelist", "", false);
  await signedCall("Milky getgamelist NO key sign with key in str only", "milkywayapp.xyz", "milkywayapp.xyz", "Darklord1121", "Darklord1121", "getGameList", "", false);
}

main().catch(console.error);
