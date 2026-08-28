import crypto from "crypto";
import http from "http";
import https from "https";

/**
 * Juwa External API v1.0 Client Specification
 * 
 * Global Parameters:
 * - agent_id: Agent ID (e.g. 1)
 * - timestamp: 10-digit seconds timestamp
 * - token: MD5(agent_id + ":" + timestamp + ":" + secret_key)
 */

export interface JuwaBaseResponse {
  code: number;
  msg?: string;
  data?: any;
  count?: number;
}

export interface JuwaAddUserResponse extends JuwaBaseResponse {
  data?: {
    account_name: string;
    user_id: string;
  };
}

export interface JuwaRechargeResponse extends JuwaBaseResponse {
  data?: {
    agent_balance: string;
    amount: string;
    pay_order_id: string;
    transaction_id: string;
    transaction_time: string;
    user_balance: string;
  };
}

export interface JuwaWithdrawResponse extends JuwaBaseResponse {
  data?: {
    agent_balance: string;
    amount: string;
    transaction_id: string;
    transaction_time: string;
    user_balance: string;
    wdw_order_id: string;
  };
}

export interface JuwaUserBalanceResponse extends JuwaBaseResponse {
  data?: {
    user_balance: string;
  };
}

export interface JuwaAgentBalanceResponse extends JuwaBaseResponse {
  data?: {
    agent_balance: string;
  };
}

export interface JuwaGetUserIdResponse extends JuwaBaseResponse {
  data?: {
    user_id: string;
  };
}

export interface JuwaConfig {
  apiUrl?: string;
  agentId?: string;
  secretKey?: string;
}

const JUWA_ERROR_MESSAGES: Record<number, string> = {
  1: "Invalid agent ID",
  2: "Invalid request parameters",
  3: "Invalid token",
  4: "Token expired",
  5: "Access IP is not white IP",
  6: "Insufficient agent balance",
  7: "Insufficient user balance",
  8: "Invalid user ID",
  9: "User account frozen",
  10: "User is currently in game. Exit to lobby and try again.",
  11: "Invalid amount",
  12: "Recharge failed, please try again later",
  13: "Recharge permission denied",
  14: "Withdrawal failed, please try again later",
  15: "Withdrawal amount exceeds daily limit",
  16: "Withdrawal under review",
  17: "Withdrawal permission denied",
  18: "Account name format error (must contain only letters, numbers, and underscores)",
  19: "Agent has no register user permission",
  20: "Account name already exists",
  21: "System failed",
  22: "Number of registered IPs exceeds upper limit",
  23: "Password must be between 6 and 32 characters",
  400: "Parameter error",
};

function md5(str: string): string {
  return crypto.createHash("md5").update(str).digest("hex").toLowerCase();
}

export class JuwaApiClient {
  private apiUrl: string;
  private agentId: string;
  private secretKey: string;

  constructor(config: JuwaConfig = {}) {
    this.apiUrl = (
      config.apiUrl ||
      process.env.JUWA_API_URL ||
      "https://ht.juwa777.com"
    ).trim().replace(/\/+$/, "");

    this.agentId = (
      config.agentId ||
      process.env.JUWA_AGENT_ID ||
      "david1233321"
    ).trim();

    this.secretKey = (
      config.secretKey ||
      process.env.JUWA_SECRET_KEY ||
      "f835a908189a2a3dea0ca89b1d48d98b"
    ).trim();
  }

  /**
   * Generate 10-digit timestamp and MD5 token: MD5(agent_id:timestamp:secret_key)
   */
  private getAuthParams(): { agent_id: string; timestamp: string; token: string } {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const rawTokenStr = `${this.agentId}:${timestamp}:${this.secretKey}`;
    const token = md5(rawTokenStr);
    return { agent_id: this.agentId, timestamp, token };
  }

  /**
   * Make Form POST Request to Juwa API endpoint
   */
  private postForm(endpointPath: string, formData: Record<string, string>): Promise<JuwaBaseResponse> {
    return new Promise((resolve, reject) => {
      try {
        const fullUrl = `${this.apiUrl}${endpointPath.startsWith("/") ? "" : "/"}${endpointPath}`;
        const parsed = new URL(fullUrl);
        const isHttps = parsed.protocol === "https:";
        const lib = isHttps ? https : http;

        const auth = this.getAuthParams();
        const fullPayload = {
          ...auth,
          ...formData,
        };

        const postData = Object.entries(fullPayload)
          .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
          .join("&");

        console.log(`[Juwa API] POST ${endpointPath} | agent_id: ${auth.agent_id} | timestamp: ${auth.timestamp}`);

        const options: any = {
          hostname: parsed.hostname,
          port: parsed.port ? Number(parsed.port) : isHttps ? 443 : 80,
          path: parsed.pathname + parsed.search,
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Content-Length": Buffer.byteLength(postData),
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
          rejectUnauthorized: false,
          timeout: 15000,
        };

        const req = lib.request(options, (res) => {
          let text = "";
          res.on("data", (chunk) => (text += chunk));
          res.on("end", () => {
            try {
              const json: JuwaBaseResponse = JSON.parse(text);
              console.log(`[Juwa API] Response from ${endpointPath} | code: ${json.code} | msg: "${json.msg || ""}"`);
              resolve(json);
            } catch (err) {
              reject(new Error(`Juwa API invalid JSON response: ${text.slice(0, 200)}`));
            }
          });
        });

        req.on("timeout", () => {
          req.destroy();
          reject(new Error("Juwa API connection timed out after 15s"));
        });

        req.on("error", (err) => reject(err));
        req.write(postData);
        req.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Helper to format Juwa response errors using status code dictionary
   */
  private formatError(json: JuwaBaseResponse): string {
    const code = Number(json.code);
    const mapped = JUWA_ERROR_MESSAGES[code];
    if (mapped) return `Juwa API error [code ${code}]: ${mapped}`;
    return json.msg || `Juwa API operation failed with code ${code}`;
  }

  /**
   * 2.1.1 Add Player Account
   */
  public async addUser(account: string, loginPwd: string): Promise<{ userId: string; accountName: string }> {
    const res = (await this.postForm("/api/external/addUser", {
      account,
      login_pwd: loginPwd,
    })) as JuwaAddUserResponse;

    if (res.code !== 0 || !res.data?.user_id) {
      throw new Error(this.formatError(res));
    }

    return {
      userId: String(res.data.user_id),
      accountName: res.data.account_name || account,
    };
  }

  /**
   * 2.1.6 Login name to get player ID
   */
  public async getUserID(accountName: string): Promise<string> {
    const res = (await this.postForm("/api/external/getUserID", {
      account_name: accountName,
    })) as JuwaGetUserIdResponse;

    if (res.code !== 0 || !res.data?.user_id) {
      throw new Error(this.formatError(res));
    }

    return String(res.data.user_id);
  }

  /**
   * 2.1.2 Recharge (Deposit)
   */
  public async recharge(userId: string, amount: number, orderId?: string): Promise<JuwaRechargeResponse> {
    const orderIdToUse = orderId || `req_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

    const res = (await this.postForm("/api/external/recharge", {
      user_id: userId,
      amount: String(amount),
      order_id: orderIdToUse,
    })) as JuwaRechargeResponse;

    if (res.code !== 0) {
      throw new Error(this.formatError(res));
    }

    return res;
  }

  /**
   * 2.1.3 Withdraw (Redeem)
   */
  public async withdraw(userId: string, amount: number, orderId?: string): Promise<JuwaWithdrawResponse> {
    const orderIdToUse = orderId || `wdw_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

    const res = (await this.postForm("/api/external/withdraw", {
      user_id: userId,
      amount: String(amount),
      order_id: orderIdToUse,
    })) as JuwaWithdrawResponse;

    if (res.code !== 0) {
      throw new Error(this.formatError(res));
    }

    return res;
  }

  /**
   * 2.1.4 Get Player Balance
   */
  public async getPlayerBalance(userId: string): Promise<number> {
    const res = (await this.postForm("/api/external/userBalance", {
      user_id: userId,
    })) as JuwaUserBalanceResponse;

    if (res.code !== 0 || res.data?.user_balance === undefined) {
      throw new Error(this.formatError(res));
    }

    return parseFloat(res.data.user_balance || "0");
  }

  /**
   * 2.1.5 Get Agent Balance
   */
  public async getAgentBalance(): Promise<number> {
    const res = (await this.postForm("/api/external/agentBalance", {})) as JuwaAgentBalanceResponse;

    if (res.code !== 0 || res.data?.agent_balance === undefined) {
      throw new Error(this.formatError(res));
    }

    return parseFloat(res.data.agent_balance || "0");
  }

  /**
   * 2.1.8 Reset Player Password
   */
  public async resetPassword(userId: string, newPwd: string): Promise<boolean> {
    const res = await this.postForm("/api/external/resetPassword", {
      user_id: userId,
      login_pwd: newPwd,
    });

    if (res.code !== 0) {
      throw new Error(this.formatError(res));
    }

    return true;
  }

  /**
   * 2.1.9 Force Player Offline
   */
  public async forceOffline(userId: string): Promise<boolean> {
    const res = await this.postForm("/api/external/playerOffline", {
      user_id: userId,
    });

    if (res.code !== 0) {
      throw new Error(this.formatError(res));
    }

    return true;
  }
}

export function isJuwaApiConfigured(): boolean {
  const secretKey = process.env.JUWA_SECRET_KEY || "f835a908189a2a3dea0ca89b1d48d98b";
  return Boolean(secretKey?.trim());
}
