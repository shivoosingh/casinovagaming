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
const account = "hackknow";

function md5(s: string) {
  return crypto.createHash("md5").update(s).digest("hex").toLowerCase();
}

function post(path: string) {
  return new Promise<string>((resolve, reject) => {
    const agent = new HttpsProxyAgent(proxy, { rejectUnauthorized: false });
    const req = https.request(
      {
        hostname: "milkywayapp.xyz",
        port: 8033,
        path,
        method: "POST",
        headers: { Host: "milkywayapp.xyz", "User-Agent": "Mozilla/5.0" },
        servername: "milkywayapp.xyz",
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

async function main() {
  const loginTime = Date.now().toString();
  const loginBody = await post(
    `/ws/service.ashx?action=agentLogin&agentName=${agentName}&agentPasswd=${md5("Darklord1121")}&time=${loginTime}`
  );
  const login = JSON.parse(loginBody);
  const agentKey = login.agentkey;
  console.log("login ok, key", agentKey?.slice(0, 8));

  const times = [
    ["ms now", Date.now().toString()],
    ["sec now", Math.floor(Date.now() / 1000).toString()],
    ["login ms", loginTime],
  ];

  const signs = [
    ["name+time+key", (t: string) => md5((agentName + t + agentKey).toLowerCase())],
    ["nameLower+time+keyLower", (t: string) => md5(agentName.toLowerCase() + t + String(agentKey).toLowerCase())],
    ["name+time+key+account", (t: string) => md5((agentName + t + agentKey + account).toLowerCase())],
    ["key+name+time", (t: string) => md5((agentKey + agentName + t).toLowerCase())],
  ];

  for (const [tlabel, time] of times) {
    for (const [slabel, sfn] of signs) {
      const sign = sfn(time);
      const path = `/ws/service.ashx?action=queryInfo&account=${account}&agentName=${agentName}&agentkey=${agentKey}&time=${time}&sign=${sign}`;
      const body = await post(path);
      const json = JSON.parse(body);
      if (String(json.code) === "200") {
        console.log(`SUCCESS ${tlabel} + ${slabel}`, json);
        return;
      }
    }
  }
  console.log("No combination worked");
}

main();
