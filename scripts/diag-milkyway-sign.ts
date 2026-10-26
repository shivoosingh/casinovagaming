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
const apiUrl = process.env.MILKYWAY_API_URL || "https://milkywayapp.xyz:8033/ws/service.ashx";
const agentName = process.env.MILKYWAY_AGENT_USERNAME || "Darklord1121";
const pass = process.env.MILKYWAY_AGENT_PASSWORD || "Darklord1121";
const account = process.argv[2] || "hackknow";

function md5(s: string, upper = false) {
  const h = crypto.createHash("md5").update(s).digest("hex");
  return upper ? h.toUpperCase() : h.toLowerCase();
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

async function login(host: string, port: number, hostHeader: string) {
  const time = Date.now().toString();
  const path = `/ws/service.ashx?action=agentLogin&agentName=${encodeURIComponent(agentName)}&agentPasswd=${md5(pass)}&time=${time}`;
  const body = await post(host, port, path, hostHeader);
  const json = JSON.parse(body);
  if (String(json.code) !== "200" || !json.agentkey) throw new Error(`login fail: ${body.slice(0, 120)}`);
  return { agentKey: json.agentkey as string, loginTime: time };
}

async function tryQuery(
  label: string,
  host: string,
  port: number,
  hostHeader: string,
  agentKey: string,
  signFn: (agentName: string, time: string, agentKey: string) => string,
  withAgentKeyParam: boolean
) {
  const time = Date.now().toString();
  const sign = signFn(agentName, time, agentKey);
  let path = `/ws/service.ashx?action=queryInfo&account=${encodeURIComponent(account)}&agentName=${encodeURIComponent(agentName)}&time=${time}&sign=${sign}`;
  if (withAgentKeyParam) path += `&agentkey=${encodeURIComponent(agentKey)}`;
  try {
    const body = await post(host, port, path, hostHeader);
    const json = JSON.parse(body);
    console.log(`${String(json.code) === "200" ? "OK" : "FAIL"} | ${label} | code=${json.code} msg=${json.msg || "ok"}`);
    if (String(json.code) === "200") console.log("   ", JSON.stringify(json).slice(0, 200));
  } catch (e) {
    console.log(`ERR  | ${label} | ${(e as Error).message}`);
  }
}

async function main() {
  const parsed = new URL(apiUrl);
  const host = parsed.hostname;
  const port = parsed.port ? Number(parsed.port) : 8033;
  const hostHeader = "milkywayapp.xyz";

  const { agentKey } = await login(host, port, hostHeader);
  console.log("agentKey:", agentKey.slice(0, 8) + "...\n");

  const formulas: Array<[string, (a: string, t: string, k: string) => string]> = [
    ["name+time+key lower", (a, t, k) => md5((a + t + k).toLowerCase())],
    ["name+time+key", (a, t, k) => md5(a + t + k)],
    ["name+loginTime+key", (a, t, k) => md5((a + t + k).toLowerCase())],
    ["key+time+name", (a, t, k) => md5((k + t + a).toLowerCase())],
    ["name+time+key upper", (a, t, k) => md5((a + t + k).toLowerCase(), true)],
  ];

  for (const [name, fn] of formulas) {
    await tryQuery(`${name} WITH agentkey`, host, port, hostHeader, agentKey, fn, true);
    await tryQuery(`${name} NO agentkey`, host, port, hostHeader, agentKey, fn, false);
  }
}

main();
