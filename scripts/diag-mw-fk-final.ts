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

async function main() {
  const login = JSON.parse(
    await post("milkywayapp.xyz", 8033, `/ws/service.ashx?action=agentLogin&agentName=${agentName}&agentPasswd=${passHash}&time=${Date.now()}`, "milkywayapp.xyz")
  );
  const agentKey = login.agentkey;
  const time = Date.now().toString();
  const formulas = [
    ["name+time+key", md5((agentName + time + agentKey).toLowerCase())],
    ["passHash+time+key", md5((passHash + time + agentKey).toLowerCase())],
    ["name+time+key+passHash", md5((agentName + time + agentKey + passHash).toLowerCase())],
    ["name+time+key upper", crypto.createHash("md5").update((agentName + time + agentKey).toLowerCase()).digest("hex").toUpperCase()],
    ["key only+time+name reversed", md5((String(agentKey) + time + agentName).toLowerCase())],
  ];

  for (const [label, sign] of formulas) {
    const path = `/ws/service.ashx?action=getgamelist&agentName=${agentName}&agentkey=${agentKey}&time=${time}&sign=${sign}`;
    const body = await post("milkywayapp.xyz", 8033, path, "milkywayapp.xyz");
    const json = JSON.parse(body);
    console.log(`${String(json.code) === "200" ? "OK" : "FAIL"} | ${label} | ${json.msg || "ok"}`);
  }

  console.log("\n--- Fire Kirin via proxy to IP ---");
  for (const host of ["52.41.26.140", "firekirin.xyz"]) {
    try {
      const body = await post(host, 8034, `/ws/service.ashx?action=agentLogin&agentName=Darklord1121&agentPasswd=${passHash}&time=${Date.now()}`, "firekirin.xyz");
      console.log(host, body.slice(0, 150));
    } catch (e) {
      console.log(host, (e as Error).message);
    }
  }
}

main();
