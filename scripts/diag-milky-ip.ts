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
const agentName = "Darklord1121";
const passHash = crypto.createHash("md5").update("Darklord1121").digest("hex").toLowerCase();

function md5(s: string) {
  return crypto.createHash("md5").update(s).digest("hex").toLowerCase();
}

function post(host: string, port: number, path: string, hostHeader: string) {
  return new Promise<string>((resolve, reject) => {
    const agent = new HttpsProxyAgent(proxy, { rejectUnauthorized: false });
    const req = https.request(
      { hostname: host, port, path, method: "POST", headers: { Host: hostHeader, "User-Agent": "Mozilla/5.0" }, servername: hostHeader, rejectUnauthorized: false, timeout: 30000, agent },
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

async function test(label: string, host: string, hostHeader: string) {
  const loginTime = Date.now().toString();
  const login = JSON.parse(await post(host, 8033, `/ws/service.ashx?action=agentLogin&agentName=${agentName}&agentPasswd=${passHash}&time=${loginTime}`, hostHeader));
  console.log(`\n${label} login:`, login.code, login.msg || "ok", "balance", login.balance);
  if (String(login.code) !== "200" || !login.agentkey) return;
  const time = Date.now().toString();
  const sign = md5((agentName + time + login.agentkey).toLowerCase());
  const q = JSON.parse(await post(host, 8033, `/ws/service.ashx?action=getgamelist&agentName=${agentName}&agentkey=${login.agentkey}&time=${time}&sign=${sign}`, hostHeader));
  console.log(`${label} getgamelist:`, q.code, q.msg || `data=${Array.isArray(q.data) ? q.data.length : "?"}`);
  const time2 = Date.now().toString();
  const sign2 = md5((agentName + time2 + login.agentkey).toLowerCase());
  const info = JSON.parse(await post(host, 8033, `/ws/service.ashx?action=queryInfo&account=hackknow&agentName=${agentName}&agentkey=${login.agentkey}&time=${time2}&sign=${sign2}`, hostHeader));
  console.log(`${label} queryInfo:`, info.code, info.msg || `bal=${info.userBalance ?? info.userbalance}`);
}

async function main() {
  await test("Milky hostname", "milkywayapp.xyz", "milkywayapp.xyz");
  await test("Milky IP 47.252.40.52", "47.252.40.52", "milkywayapp.xyz");
  await test("Orion IP", "34.212.168.0", "orionstars.vip");
}

main();
