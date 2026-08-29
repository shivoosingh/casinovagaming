import crypto from "crypto";
import https from "https";
import { HttpsProxyAgent } from "https-proxy-agent";

/**
 * Orion Stars Official Terminal API v1.2.6 Client
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
  proxyUrl?: string;
}

function md5(str: string): string {
  return crypto.createHash("md5").update(str).digest("hex").toLowerCase();
}

/**
 * Perform HTTPS POST with Webshare Proxy support
 */
function httpsPost(urlStr: string, hostHeader: string, proxyUrlStr?: string, timeoutMs: number = 15000): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const parsed = new URL(urlStr);

      const agent = proxyUrlStr ? new HttpsProxyAgent(proxyUrlStr, { rejectUnauthorized: false }) : undefined;

      const options: https.RequestOptions = {
        hostname: parsed.hostname,
        port: parsed.port ? Number(parsed.port) : 8033,
        path: parsed.pathname + parsed.search,
        method: "POST",
        headers: {
          Host: hostHeader,
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        servername: hostHeader,
        rejectUnauthorized: false,
        timeout: timeoutMs,
        agent: agent,
      };

      const req = https.request(options, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve(data));
      });

      req.on("timeout", () => {
        req.destroy();
        reject(new Error(`Orion Stars API connection timed out after ${timeoutMs / 1000}s`));
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
  private proxyUrl?: string;
  public lastAgentBalance: number = 0;

  constructor(config: OrionStarsConfig = {}) {
    this.apiUrl = (
      config.apiUrl ||
      process.env.ORIONSTARS_API_URL ||
      "https://34.212.168.0:8033/ws/service.ashx"
    ).trim();

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

    this.proxyUrl = (
      config.proxyUrl ||
      process.env.ORIONSTARS_PROXY_URL ||
      process.env.GAMEVAULT_PROXY_URL ||
      "http://sbhxwsxp:xn5frycnonl5@198.23.243.226:6361"
    ).trim();
  }

  private async request(url: string): Promise<any> {
    const text = await httpsPost(url, "orionstars.vip", this.proxyUrl);
    let json: any = {};
    try {
      json = JSON.parse(text);
    } catch (e) {
      throw new Error(`Orion Stars invalid JSON response: ${text.slice(0, 200)}`);
    }

    return json;
  }

  public async getValidSession(): Promise<{ agentKey: string; time: string }> {
    const time = Date.now().toString();
    const loginUrl = `${this.apiUrl}?action=agentLogin&agentName=${encodeURIComponent(
      this.agentName
    )}&agentPasswd=${encodeURIComponent(this.agentPasswdHash)}&time=${time}`;

    console.log(`[OrionStars API] agentLogin call | agentName: "${this.agentName}" | proxy: ${this.proxyUrl ? "ENABLED" : "DIRECT"}`);

    const json: OrionStarsLoginResponse = await this.request(loginUrl);

    console.log(`[OrionStars API] agentLogin response | code: ${json.code} | balance: "${json.balance}" | agentKey: ${json.agentkey ? json.agentkey.slice(0, 6) + "..." : "NONE"}`);

    if (String(json.code) !== "200" || !json.agentkey) {
      const msg = json.msg || `code ${json.code}`;
      throw new Error(`Orion Stars agentLogin failed: ${msg}`);
    }

    this.lastAgentBalance = parseFloat(String(json.balance || "0"));
    return { agentKey: json.agentkey, time };
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

    console.log(`[OrionStars API] registerUser calling for account: "${account}"...`);

    const json = await this.request(url);

    console.log(`[OrionStars API] registerUser response | code: ${json.code} | msg: "${json.msg || ""}"`);

    if (String(json.code) !== "200") {
      const errMsg = json.msg || `Registration failed with code ${json.code}`;
      throw new Error(`Orion Stars registerUser error [code ${json.code}]: ${errMsg}`);
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
      throw new Error(`Orion Stars queryInfo error [code ${json.code}]: ${errMsg}`);
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
      throw new Error(`Orion Stars recharge error [code ${json.code}]: ${errMsg}`);
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
      throw new Error(`Orion Stars redeem error [code ${json.code}]: ${errMsg}`);
    }

    return { success: true, account, amount };
  }
}

export function isOrionStarsApiConfigured(): boolean {
  const username = process.env.ORIONSTARS_AGENT_USERNAME || "Darklord1121";
  const password = process.env.ORIONSTARS_AGENT_PASSWORD || "Re3set@123#";
  return Boolean(username?.trim() && password?.trim());
}
