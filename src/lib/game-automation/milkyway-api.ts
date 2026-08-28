import crypto from "crypto";
import https from "https";

/**
 * Milky Way Official Terminal API v1.2.3 Client
 * 
 * Required parameters for registerUser:
 * - account
 * - passwd (MD5)
 * - agentName
 * - agentkey
 * - time
 * - sign = MD5(lowercase(agentName) + time + lowercase(agentKey))
 */

export interface MilkyWayLoginResponse {
  code: string | number;
  balance?: string | number;
  agentkey?: string;
  msg?: string;
}

export interface MilkyWayBaseResponse {
  code: string | number;
  msg?: string;
}

export interface MilkyWayQueryResponse extends MilkyWayBaseResponse {
  agentBalance?: number;
  gameId?: number;
  userbalance?: number;
  webLoginUrl?: string;
}

export interface MilkyWayConfig {
  apiUrl?: string;
  agentName?: string;
  agentPassword?: string;
}

function md5(str: string): string {
  return crypto.createHash("md5").update(str).digest("hex").toLowerCase();
}

/**
 * Perform HTTPS POST with custom SSL agent bypass and 15s timeout
 */
function httpsPost(urlStr: string, timeoutMs: number = 15000): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const parsed = new URL(urlStr);

      const options: https.RequestOptions = {
        hostname: "47.252.40.52", // Public IP for milkywayapp.xyz
        port: parsed.port ? Number(parsed.port) : 8033,
        path: parsed.pathname + parsed.search,
        method: "POST",
        headers: {
          Host: "milkywayapp.xyz",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        servername: "milkywayapp.xyz",
        rejectUnauthorized: false,
        timeout: timeoutMs,
      };

      const req = https.request(options, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve(data));
      });

      req.on("timeout", () => {
        req.destroy();
        reject(new Error(`Milky Way API connection timed out after ${timeoutMs / 1000}s`));
      });

      req.on("error", (e) => reject(e));
      req.end();
    } catch (err) {
      reject(err);
    }
  });
}

export class MilkyWayApiClient {
  private apiUrl: string;
  private agentName: string;
  private agentPasswdHash: string;
  public lastAgentBalance: number = 0;

  constructor(config: MilkyWayConfig = {}) {
    this.apiUrl = (
      config.apiUrl ||
      process.env.MILKYWAY_API_URL ||
      "https://47.252.40.52:8033/ws/service.ashx"
    ).trim();

    this.agentName = (
      config.agentName ||
      process.env.MILKYWAY_AGENT_USERNAME ||
      "Darklord1121"
    ).trim();

    const rawPass =
      config.agentPassword ||
      process.env.MILKYWAY_AGENT_PASSWORD ||
      "Darklord1121";

    this.agentPasswdHash = md5(rawPass.trim());
  }

  private async request(url: string): Promise<any> {
    const text = await httpsPost(url);
    let json: any = {};
    try {
      json = JSON.parse(text);
    } catch (e) {
      throw new Error(`Milky Way invalid JSON response: ${text.slice(0, 200)}`);
    }

    return json;
  }

  /**
   * Perform fresh agentLogin on EVERY call to guarantee no stale cached agentKey or timestamp is ever used.
   */
  public async getFreshSession(): Promise<{ agentKey: string; time: string; balance: number }> {
    const time = Date.now().toString();
    const loginUrl = `${this.apiUrl}?action=agentLogin&agentName=${encodeURIComponent(
      this.agentName
    )}&agentPasswd=${encodeURIComponent(this.agentPasswdHash)}&time=${time}`;

    console.log(`[MW] Executing fresh agentLogin | agentName: "${this.agentName}" | time: ${time}`);

    const json: MilkyWayLoginResponse = await this.request(loginUrl);

    const keyPrefix = json.agentkey ? `${json.agentkey.slice(0, 6)}...` : "NONE";
    console.log(`[MW] agentLogin response | code: ${json.code} | balance: "${json.balance}" | agentKey prefix: ${keyPrefix}`);

    if (String(json.code) !== "200" || !json.agentkey) {
      const msg = json.msg || `code ${json.code}`;
      throw new Error(`Milky Way agentLogin failed: ${msg}`);
    }

    const bal = parseFloat(String(json.balance || "0"));
    this.lastAgentBalance = bal;

    return { agentKey: json.agentkey, time, balance: bal };
  }

  /**
   * Calculate fresh MD5 signature per v1.2.3 spec: MD5(lowercase(agentName) + time + lowercase(freshAgentKey))
   */
  private async createFreshSign(): Promise<{ sign: string; time: string; agentKey: string }> {
    const session = await this.getFreshSession();
    const rawSignStr = (this.agentName + session.time + session.agentKey).toLowerCase();
    const sign = md5(rawSignStr);
    return { sign, time: session.time, agentKey: session.agentKey };
  }

  /**
   * Register a new Milky Way player account
   */
  public async createAccount(
    account: string,
    pass: string
  ): Promise<{ account: string; pass: string }> {
    const { sign, time, agentKey } = await this.createFreshSign();
    const passHash = md5(pass);

    const url = `${this.apiUrl}?action=registerUser&account=${encodeURIComponent(
      account
    )}&passwd=${encodeURIComponent(passHash)}&agentName=${encodeURIComponent(
      this.agentName
    )}&agentkey=${encodeURIComponent(agentKey)}&time=${time}&sign=${sign}`;

    console.log(`[MW Diagnostic] Sending registerUser request:`);
    console.log(`  agentName: "${this.agentName}"`);
    console.log(`  timestamp: ${time} (${time.length} digits, ms format)`);
    console.log(`  API endpoint: ${this.apiUrl}`);
    console.log(`  HTTP method: POST`);
    console.log(`  signature length: ${sign.length}`);
    console.log(`  agentKey source: fresh agentLogin response`);
    console.log(`  account: "${account}"`);

    const json = await this.request(url);

    console.log(`[MW Diagnostic] registerUser raw API response | code: ${json.code} | msg: "${json.msg || ""}"`);

    if (String(json.code) !== "200") {
      const msg = json.msg || `Registration failed with code ${json.code}`;
      throw new Error(`Milky Way registerUser error [code ${json.code}]: ${msg}`);
    }

    return { account, pass };
  }

  /**
   * Query user information
   */
  public async queryInfo(account: string): Promise<MilkyWayQueryResponse> {
    const { sign, time, agentKey } = await this.createFreshSign();

    const url = `${this.apiUrl}?action=queryInfo&account=${encodeURIComponent(
      account
    )}&agentName=${encodeURIComponent(this.agentName)}&agentkey=${encodeURIComponent(
      agentKey
    )}&time=${time}&sign=${sign}`;

    console.log(`[MW] Starting queryInfo | account: "${account}"`);
    const json: MilkyWayQueryResponse = await this.request(url);
    console.log(`[MW] queryInfo response received | code: ${json.code} | msg: "${json.msg || ""}"`);

    if (String(json.code) !== "200") {
      const msg = json.msg || `Query failed with code ${json.code}`;
      throw new Error(`Milky Way queryInfo error [code ${json.code}]: ${msg}`);
    }

    return json;
  }

  /**
   * Recharge user balance
   */
  public async rechargePlayer(account: string, amount: number): Promise<{ success: boolean; account: string; amount: number }> {
    const { sign, time, agentKey } = await this.createFreshSign();

    const url = `${this.apiUrl}?action=recharge&account=${encodeURIComponent(
      account
    )}&amount=${Math.floor(amount)}&agentName=${encodeURIComponent(
      this.agentName
    )}&agentkey=${encodeURIComponent(agentKey)}&time=${time}&sign=${sign}`;

    console.log(`[MW] Starting rechargePlayer | account: "${account}" | amount: ${amount}`);
    const json = await this.request(url);
    console.log(`[MW] rechargePlayer response received | code: ${json.code}`);

    if (String(json.code) !== "200") {
      const msg = json.msg || `Recharge failed with code ${json.code}`;
      throw new Error(`Milky Way recharge error [code ${json.code}]: ${msg}`);
    }

    return { success: true, account, amount };
  }

  /**
   * Redeem user balance back to agent account
   */
  public async withdrawPlayer(account: string, amount: number): Promise<{ success: boolean; account: string; amount: number }> {
    const { sign, time, agentKey } = await this.createFreshSign();

    const url = `${this.apiUrl}?action=redeem&account=${encodeURIComponent(
      account
    )}&amount=${Math.floor(amount)}&agentName=${encodeURIComponent(
      this.agentName
    )}&agentkey=${encodeURIComponent(agentKey)}&time=${time}&sign=${sign}`;

    console.log(`[MW] Starting withdrawPlayer | account: "${account}" | amount: ${amount}`);
    const json = await this.request(url);
    console.log(`[MW] withdrawPlayer response received | code: ${json.code}`);

    if (String(json.code) !== "200") {
      const msg = json.msg || `Redeem failed with code ${json.code}`;
      throw new Error(`Milky Way redeem error [code ${json.code}]: ${msg}`);
    }

    return { success: true, account, amount };
  }
}

export function isMilkyWayApiConfigured(): boolean {
  const username = process.env.MILKYWAY_AGENT_USERNAME || "Darklord1121";
  const password = process.env.MILKYWAY_AGENT_PASSWORD || "Darklord1121";
  return Boolean(username?.trim() && password?.trim());
}
