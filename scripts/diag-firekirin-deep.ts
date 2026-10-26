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

const proxy = process.env.FIREKIRIN_PROXY_URL || process.env.GAMEVAULT_PROXY_URL;

function md5(s: string) {
  return crypto.createHash("md5").update(s).digest("hex").toLowerCase();
}

function post(host: string, port: number, path: string, hostHeader: string, useProxy: boolean) {
  return new Promise<string>((resolve, reject) => {
    const agent = useProxy && proxy ? new HttpsProxyAgent(proxy, { rejectUnauthorized: false }) : undefined;
    const req = https.request(
      {
        hostname: host,
        port,
        path,
        method: "POST",
        headers: { Host: hostHeader, "User-Agent": "Mozilla/5.0" },
        servername: hostHeader,
        rejectUnauthorized: false,
        timeout: 30000,
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

async function tryLogin(label: string, host: string, port: number, hostHeader: string, useProxy: boolean) {
  const time = Date.now().toString();
  const path = `/ws/service.ashx?action=agentLogin&agentName=Darklord1121&agentPasswd=${md5("Darklord1121")}&time=${time}`;
  try {
    const body = await post(host, port, path, hostHeader, useProxy);
    const json = JSON.parse(body);
    const key = json.agentkey || json.agentKey;
    console.log(`${String(json.code) === "200" ? "OK" : "FAIL"} | ${label} | code=${json.code} key=${key ? "yes" : "no"} body=${body.slice(0, 120)}`);
  } catch (e) {
    console.log(`ERR  | ${label} | ${(e as Error).message}`);
  }
}

async function main() {
  const tests = [
    ["FK hostname + proxy", "firekirin.xyz", 8034, "firekirin.xyz", true],
    ["FK hostname direct", "firekirin.xyz", 8034, "firekirin.xyz", false],
    ["FK IP guess + proxy", "34.212.168.0", 8034, "firekirin.xyz", true],
    ["FK IP guess direct", "34.212.168.0", 8034, "firekirin.xyz", false],
    ["Orion IP port8034 + proxy", "34.212.168.0", 8034, "firekirin.xyz", true],
  ];
  for (const t of tests) await tryLogin(t[0], t[1], Number(t[2]), t[3], t[4]);
}

main();
