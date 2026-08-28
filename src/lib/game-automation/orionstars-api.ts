import crypto from "crypto";
import https from "https";

/**
 * Orion Stars Official Terminal API v1.2.6 Client
 * 
 * Endpoints:
 * 1. Agent Login: /ws/service.ashx?action=agentLogin
 * 2. Register User Account: /ws/service.ashx?action=registerUser
 * 3. Query User Info: /ws/service.ashx?action=queryInfo
 * 4. Recharge: /ws/service.ashx?action=recharge
 * 5. Redeem: /ws/service.ashx?action=redeem
 * 6. Check Account Name: /ws/service.ashx?action=checkAccountName
 */

export interface OrionStarsLoginResponse {
  code: string | number;
  balance?: string | number;
  agentkey?: string;
  msg?: string;
}

export interface OrionStarsBaseResponse {
  code: string | number;
  msg?: string;
  status?: number;
}

export interface OrionStarsQueryResponse extends OrionStarsBaseResponse {
  agentBalance?: number;
  gameId?: number;
  userbalance?: number;
  webLoginUrl?: string;
}

export interface OrionStarsConfig {
  apiUrl?: string;
  agentName?: string;
  agentPassword?: string;
}

function md5(str: string): string {
  return crypto.createHash("md5").update(str).digest("hex").toLowerCase();
}

/**
 * Perform HTTPS POST with custom SSL agent bypass for Vercel/Node environment
 */
function httpsPost(urlStr: string): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const parsed = new URL(urlStr);

      const options: https.RequestOptions = {
        hostname: parsed.hostname,
        port: parsed.port || 443,
        path: parsed.pathname + parsed.search,
        method: "POST",
        headers: {
          Host: "orionstars.vip",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        servername: "orionstars.vip",
        rejectUnauthorized: false,
      };

      const req = https.request(options, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve(data));
      });

      req.on("error", (e) => reject(e));
      req.end();
    } catch (err) {
      reject(err);
    }
  });
}

export class OrionStarsApiClient {
  private apiUrl: string;
  private agentName: string;
  private agentPasswdHash: string;
  private agentKey: string | null = null;
  private sessionTime: string | null = null;
  private agentKeyExpiresAt: number = 0;
  public lastAgentBalance: number = 0;

  constructor(config: OrionStarsConfig = {}) {
    this.apiUrl = (
      config.apiUrl ||
      process.env.ORIONSTARS_API_URL ||
      "https://34.212.168.0:8033/ws/service.ashx"
    ).trim();

    // Orion Stars agentName
    this.agentName = (
      config.agentName ||
      process.env.ORIONSTARS_AGENT_USERNAME ||
      "Darklord1121"
    ).trim();

    const rawPass =
      config.agentPassword ||
      process.env.ORIONSTARS_AGENT_PASSWORD ||
      "Re3set@123#";

    this.agentPasswdHash = md5(rawPass.trim());
  }

  private async request(url: string): Promise<any> {
    const text = await httpsPost(url);
    let json: any = {};
    try {
      json = JSON.parse(text);
    } catch (e) {
      throw new Error(`Orion Stars invalid JSON response: ${text.slice(0, 200)}`);
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

    console.log(`[OrionStars API Diagnostic] agentLogin call | agentName: "${this.agentName}" | endpoint: ${this.apiUrl}`);

    const json: OrionStarsLoginResponse = await this.request(loginUrl);

    console.log(`[OrionStars API Diagnostic] agentLogin response | code: ${json.code} | raw balance: "${json.balance}" | agentKey prefix: ${json.agentkey ? json.agentkey.slice(0, 6) + "..." : "NONE"}`);

    if (String(json.code) !== "200" || !json.agentkey) {
      const msg = json.msg || `code ${json.code}`;
      throw new Error(`Orion Stars agentLogin failed: ${msg}`);
    }

    this.agentKey = json.agentkey;
    this.sessionTime = time;
    this.lastAgentBalance = parseFloat(String(json.balance || "0"));
    this.agentKeyExpiresAt = now + 3 * 60 * 1000;
    return { agentKey: this.agentKey, time: this.sessionTime };
  }

  public async getValidAgentKey(): Promise<string> {
    const session = await this.getValidSession();
    return session.agentKey;
  }

  private async createSign(): Promise<{ sign: string; time: string; agentKey: string }> {
    const session = await this.getValidSession();
    const rawSignStr = (this.agentName + session.time + session.agentKey).toLowerCase();
    const sign = md5(rawSignStr);
    return { sign, time: session.time, agentKey: session.agentKey };
  }

  public async checkAccountName(account: string): Promise<{ available: boolean }> {
    const { sign, time, agentKey } = await this.createSign();

    const url = `${this.apiUrl}?action=checkAccountName&account=${encodeURIComponent(
      account
    )}&agentName=${encodeURIComponent(this.agentName)}&agentkey=${encodeURIComponent(
      agentKey
    )}&time=${time}&sign=${sign}`;

    const json = await this.request(url);
    if (String(json.code) !== "200") {
      const errMsg = json.msg || `checkAccountName failed with code ${json.code}`;
      throw new Error(`Orion Stars checkAccountName error: ${errMsg}`);
    }

    return { available: Number(json.status) === 0 };
  }

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

    console.log(`[OrionStars API Diagnostic] registerUser call | account: "${account}" | sign prefix: "${sign.slice(0, 8)}..."`);

    const json = await this.request(url);

    console.log(`[OrionStars API Diagnostic] registerUser response | code: ${json.code} | msg: "${json.msg || ""}" | userbalance: ${json.userbalance}`);

    if (String(json.code) !== "200") {
      const errMsg = json.msg || `Registration failed with code ${json.code}`;
      throw new Error(`Orion Stars registerUser error: ${errMsg}`);
    }

    return { account, pass };
  }

  public async queryInfo(account: string): Promise<OrionStarsQueryResponse> {
    const { sign, time, agentKey } = await this.createSign();

    const url = `${this.apiUrl}?action=queryInfo&account=${encodeURIComponent(
      account
    )}&agentName=${encodeURIComponent(this.agentName)}&agentkey=${encodeURIComponent(
      agentKey
    )}&time=${time}&sign=${sign}`;

    const json: OrionStarsQueryResponse = await this.request(url);
    if (String(json.code) !== "200") {
      const errMsg = json.msg || `Query failed with code ${json.code}`;
      throw new Error(`Orion Stars queryInfo error: ${errMsg}`);
    }

    return json;
  }

  public async rechargePlayer(account: string, amount: number): Promise<{ success: boolean; account: string; amount: number }> {
    const { sign, time, agentKey } = await this.createSign();

    const url = `${this.apiUrl}?action=recharge&account=${encodeURIComponent(
      account
    )}&amount=${Math.floor(amount)}&agentName=${encodeURIComponent(
      this.agentName
    )}&agentkey=${encodeURIComponent(agentKey)}&time=${time}&sign=${sign}`;

    const json = await this.request(url);
    if (String(json.code) !== "200") {
      const errMsg = json.msg || `Recharge failed with code ${json.code}`;
      throw new Error(`Orion Stars recharge error: ${errMsg}`);
    }

    return { success: true, account, amount };
  }

  public async withdrawPlayer(account: string, amount: number): Promise<{ success: boolean; account: string; amount: number }> {
    const { sign, time, agentKey } = await this.createSign();

    const url = `${this.apiUrl}?action=redeem&account=${encodeURIComponent(
      account
    )}&amount=${Math.floor(amount)}&agentName=${encodeURIComponent(
      this.agentName
    )}&agentkey=${encodeURIComponent(agentKey)}&time=${time}&sign=${sign}`;

    const json = await this.request(url);
    if (String(json.code) !== "200") {
      const errMsg = json.msg || `Redeem failed with code ${json.code}`;
      throw new Error(`Orion Stars redeem error: ${errMsg}`);
    }

    return { success: true, account, amount };
  }
}

export function isOrionStarsApiConfigured(): boolean {
  const username = process.env.ORIONSTARS_AGENT_USERNAME || "Darklord1121";
  const password = process.env.ORIONSTARS_AGENT_PASSWORD || "Re3set@123#";
  return Boolean(username?.trim() && password?.trim());
}
