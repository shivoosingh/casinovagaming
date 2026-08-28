import { createHash } from "crypto";

const agentId = "160496";
const secretKey = "352a22adfdc2675cf6b90e621fa687dd";

function md5(s: string) {
  return createHash("md5").update(s).digest("hex").toUpperCase();
}

async function testConfig(
  url: string,
  sigFormat: string,
  useJson: boolean,
  extraHeaders: Record<string, string> = {}
) {
  const timestamp = String(Date.now());
  const rawSig = sigFormat
    .replace("{agent_id}", agentId)
    .replace("{timestamp}", timestamp)
    .replace("{secret_key}", secretKey);
  const token = md5(rawSig);

  const testAccount = `casinova_${Math.floor(1000 + Math.random() * 9000)}`;

  let res: Response;
  if (useJson) {
    res = await fetch(`${url}/api/external/addUser`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...extraHeaders },
      body: JSON.stringify({
        agent_id: agentId,
        timestamp,
        token,
        account: testAccount,
        login_pwd: "123123",
      }),
    });
  } else {
    const formData = new FormData();
    formData.append("agent_id", agentId);
    formData.append("timestamp", timestamp);
    formData.append("token", token);
    formData.append("account", testAccount);
    formData.append("login_pwd", "123123");

    res = await fetch(`${url}/api/external/addUser`, {
      method: "POST",
      headers: extraHeaders,
      body: formData,
    });
  }

  const text = await res.text();
  console.log(`[URL: ${url} | Sig: ${sigFormat} | JSON: ${useJson}] -> Status ${res.status}: ${text}`);
  return text;
}

async function main() {
  console.log("=== Comprehensive Game Vault API Diagnostic ===");

  const urls = [
    "https://agent.gamevault999.com",
    "http://agent.gamevault999.com",
    "https://api.gamevault999.com",
    "http://api.gamevault999.com",
    "https://agentserver.gamevault999.com",
  ];

  const sigFormats = [
    "{agent_id}:{timestamp}:{secret_key}",
    "{agent_id}:{secret_key}:{timestamp}",
    "{secret_key}:{agent_id}:{timestamp}",
    "{agent_id}{timestamp}{secret_key}",
  ];

  for (const url of urls) {
    for (const sig of sigFormats) {
      try {
        await testConfig(url, sig, false);
        await testConfig(url, sig, true);
      } catch (e: any) {
        // ignore network error
      }
    }
  }
}

main().catch(console.error);
