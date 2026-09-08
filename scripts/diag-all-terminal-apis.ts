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

function md5(s: string) {
  return crypto.createHash("md5").update(s).digest("hex").toLowerCase();
}

const proxy = process.env.GAMEVAULT_PROXY_URL;

function post(
  hostname: string,
  port: number,
  path: string,
  hostHeader: string
): Promise<{ status?: number; body: string }> {
  return new Promise((resolve, reject) => {
    const agent = proxy ? new HttpsProxyAgent(proxy, { rejectUnauthorized: false }) : undefined;
    const req = https.request(
      {
        hostname,
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
        let body = "";
        res.on("data", (c) => (body += c));
        res.on("end", () => resolve({ status: res.statusCode, body }));
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

async function agentLogin(
  label: string,
  apiHost: string,
  port: number,
  hostHeader: string,
  agentName: string,
  password: string
) {
  const time = Date.now().toString();
  const path = `/ws/service.ashx?action=agentLogin&agentName=${encodeURIComponent(agentName)}&agentPasswd=${md5(password)}&time=${time}`;
  try {
    const res = await post(apiHost, port, path, hostHeader);
    let json: any = {};
    try {
      json = JSON.parse(res.body);
    } catch {
      return { label, ok: false, detail: `non-json: ${res.body.slice(0, 80)}` };
    }
    const key = json.agentkey || json.agentKey;
    return {
      label,
      ok: String(json.code) === "200" && Boolean(key),
      detail: `code=${json.code} balance=${json.balance ?? json.Balance ?? "?"} msg=${json.msg || "ok"} key=${key ? String(key).slice(0, 6) + "..." : "NONE"}`,
    };
  } catch (e) {
    return { label, ok: false, detail: (e as Error).message };
  }
}

async function main() {
  console.log("Proxy:", proxy ? "ENABLED" : "DIRECT");
  console.log("");

  const tests = [
    ["Orion Stars", "34.212.168.0", 8033, "orionstars.vip", "Darklord1121", "Re3set@123#"],
    ["Milky Way (Darklord1121)", "milkywayapp.xyz", 8033, "milkywayapp.xyz", "Darklord1121", "Darklord1121"],
    ["Milky Way (Re3set@123#)", "milkywayapp.xyz", 8033, "milkywayapp.xyz", "Darklord1121", "Re3set@123#"],
    ["Milky Way IP guess", "34.212.168.0", 8033, "milkywayapp.xyz", "Darklord1121", "Darklord1121"],
    ["Fire Kirin", "firekirin.xyz", 8034, "firekirin.xyz", "Darklord1121", "Darklord1121"],
  ];

  for (const [label, host, port, hostHeader, user, pass] of tests) {
    const r = await agentLogin(label, host, Number(port), hostHeader, user, pass);
    console.log(`${r.ok ? "OK" : "FAIL"} | ${r.label}`);
    console.log(`      ${r.detail}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
