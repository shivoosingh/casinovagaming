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
  private agentKey: string | null = null;
  private sessionTime: string | null = null;
  private agentKeyExpiresAt: number = 0;
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
   * Perform agentLogin to obtain fresh agentKey and balance.
   */
  public async getValidSession(): Promise<{ agentKey: string; time: string }> {
    const now = Date.now();
    if (this.agentKey && this.sessionTime && this.agentKeyExpiresAt > now) {
      return { agentKey: this.agentKey, time: this.sessionTime };
    }

    const time = now.toString();
    const loginUrl = `${this.apiUrl}?action=agentLogin&agentName=${encodeURIComponent(
      this.agentName
    )}&agentPasswd=${encodeURIComponent(this.agentPasswdHash)}&time=${time}`;

    console.log(`[MW] Starting agentLogin | agentName: "${this.agentName}"`);

    const json: MilkyWayLoginResponse = await this.request(loginUrl);

    console.log(`[MW] agentLogin response received | code: ${json.code} | balance: "${json.balance}" | agentKey prefix: ${json.agentkey ? json.agentkey.slice(0, 6) + "..." : "NONE"}`);

    if (String(json.code) !== "200" || !json.agentkey) {
      const msg = json.msg || `code ${json.code}`;
      throw new Error(`Milky Way agentLogin failed: ${msg}`);
    }

    this.agentKey = json.agentkey;
    this.sessionTime = time;
    this.lastAgentBalance = parseFloat(String(json.balance || "0"));
    this.agentKeyExpiresAt = now + 3 * 60 * 1000;

    return { agentKey: this.agentKey, time: this.sessionTime };
  }

  /**
   * Calculate MD5 signature per v1.2.3 spec: MD5(lowercase(agentName) + time + lowercase(agentKey))
   */
  private async createSign(): Promise<{ sign: string; time: string; agentKey: string }> {
    const session = await this.getValidSession();
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
    const { sign, time, agentKey } = await this.createSign();
    const passHash = md5(pass);

    const url = `${this.apiUrl}?action=registerUser&account=${encodeURIComponent(
      account
    )}&passwd=${encodeURIComponent(passHash)}&agentName=${encodeURIComponent(
      this.agentName
    )}&agentkey=${encodeURIComponent(agentKey)}&time=${time}&sign=${sign}`;

    console.log(`[MW] Starting registerUser | account: "${account}" | sign prefix: "${sign.slice(0, 8)}..."`);

    const json = await this.request(url);

    console.log(`[MW] registerUser response received | code: ${json.code} | msg: "${json.msg || ""}" | userbalance: ${json.userbalance}`);

    if (String(json.code) !== "200") {
      const msg = json.msg || `Registration failed with code ${json.code}`;
      throw new Error(`Milky Way registerUser error: ${msg}`);
    }

    return { account, pass };
  }

  /**
   * Query user information
   */
  public async queryInfo(account: string): Promise<MilkyWayQueryResponse> {
    const { sign, time, agentKey } = await this.createSign();

    const url = `${this.apiUrl}?action=queryInfo&account=${encodeURIComponent(
      account
    )}&agentName=${encodeURIComponent(this.agentName)}&agentkey=${encodeURIComponent(
      agentKey
    )}&time=${time}&sign=${sign}`;

    console.log(`[MW] Starting queryInfo | account: "${account}"`);
    const json: MilkyWayQueryResponse = await this.request(url);
    console.log(`[MW] queryInfo response received | code: ${json.code}`);

    if (String(json.code) !== "200") {
      const msg = json.msg || `Query failed with code ${json.code}`;
      throw new Error(`Milky Way queryInfo error: ${msg}`);
    }

    return json;
  }

  /**
   * Recharge user balance
   */
  public async rechargePlayer(account: string, amount: number): Promise<{ success: boolean; account: string; amount: number }> {
    const { sign, time, agentKey } = await this.createSign();

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
      throw new Error(`Milky Way recharge error: ${msg}`);
    }

    return { success: true, account, amount };
  }

  /**
   * Redeem user balance back to agent account
   */
  public async withdrawPlayer(account: string, amount: number): Promise<{ success: boolean; account: string; amount: number }> {
    const { sign, time, agentKey } = await this.createSign();

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
      throw new Error(`Milky Way redeem error: ${msg}`);
    }

    return { success: true, account, amount };
  }
}

export function isMilkyWayApiConfigured(): boolean {
  const username = process.env.MILKYWAY_AGENT_USERNAME || "Darklord1121";
  const password = process.env.MILKYWAY_AGENT_PASSWORD || "Darklord1121";
  return Boolean(username?.trim() && password?.trim());
}
