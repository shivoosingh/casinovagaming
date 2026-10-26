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
const account = "hackknow";

function md5(s: string) {
  return crypto.createHash("md5").update(s).digest("hex").toLowerCase();
}

function post(host: string, port: number, path: string, hostHeader: string) {
  return new Promise<string>((resolve, reject) => {
    const agent = new HttpsProxyAgent(proxy, { rejectUnauthorized: false });
    const req = https.request(
      {
        hostname: host,
        port,
        path,
        method: "POST",
        headers: { Host: hostHeader, "User-Agent": "Mozilla/5.0" },
        servername: hostHeader,
        rejectUnauthorized: false,
        timeout: 25000,
        agent,
      },
      (res) => {
        let d = "";
        res.on("data", (c) => (d += c));
        res.on("end", () => resolve(d));
      }
    );
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("timeout"));
    });
    req.end();
  });
}

async function loginMw(host: string, hostHeader: string) {
  const agentName = "Darklord1121";
  const time = Date.now().toString();
  const path = `/ws/service.ashx?action=agentLogin&agentName=${agentName}&agentPasswd=${md5("Darklord1121")}&time=${time}`;
  const body = await post(host, 8033, path, hostHeader);
  return JSON.parse(body);
}

async function query(host: string, hostHeader: string, label: string, url: string) {
  try {
    const body = await post(host, 8033, url.replace(/^https?:\/\/[^/]+/, ""), hostHeader);
    const json = JSON.parse(body);
    console.log(`${String(json.code) === "200" ? "OK" : "FAIL"} | ${label} | ${json.msg || "ok"}`);
    if (String(json.code) === "200") console.log(" ", JSON.stringify(json).slice(0, 180));
  } catch (e) {
    console.log(`ERR | ${label} | ${(e as Error).message}`);
  }
}

async function main() {
  const hosts = [
    ["milkywayapp.xyz", "milkywayapp.xyz"],
    ["34.212.168.0", "milkywayapp.xyz"],
    ["34.212.168.0", "orionstars.vip"],
  ];

  for (const [host, hostHeader] of hosts) {
    console.log(`\n=== host=${host} Host=${hostHeader} ===`);
    const login = await loginMw(host, hostHeader);
    console.log("login:", JSON.stringify(login));
    const agentKey = login.agentkey || login.agentKey;
    if (!agentKey) continue;
    const agentName = "Darklord1121";
    const time = Date.now().toString();
    const sign = md5((agentName + time + agentKey).toLowerCase());

    await query(host, hostHeader, "query agentkey lower", `/ws/service.ashx?action=queryInfo&account=${account}&agentName=${agentName}&agentkey=${agentKey}&time=${time}&sign=${sign}`);
    await query(host, hostHeader, "query agentKey camel", `/ws/service.ashx?action=queryInfo&account=${account}&agentName=${agentName}&agentKey=${agentKey}&time=${time}&sign=${sign}`);
    await query(host, hostHeader, "query no key param", `/ws/service.ashx?action=queryInfo&account=${account}&agentName=${agentName}&time=${time}&sign=${sign}`);

    const loginTime = String(login.time || time);
    const signLogin = md5((agentName + loginTime + agentKey).toLowerCase());
    await query(host, hostHeader, "query login time sign", `/ws/service.ashx?action=queryInfo&account=${account}&agentName=${agentName}&agentkey=${agentKey}&time=${loginTime}&sign=${signLogin}`);
  }
}

main();
