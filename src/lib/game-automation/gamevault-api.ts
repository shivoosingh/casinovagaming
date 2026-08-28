import { createHash } from "crypto";

/**
 * Game Vault Direct REST API Client
 *
 * Official API Integration for Game Vault external API:
 * 1. Global Signature: agent_id, timestamp (13-digit ms), token = MD5(agent_id:timestamp:secret_key).toUpperCase()
 * 2. Add Player Account (POST /api/external/addUser)
 * 3. Recharge (POST /api/external/recharge)
 * 4. Withdraw (POST /api/external/withdraw)
 * 5. Get Player Balance (POST /api/external/userBalance)
 * 6. Login name to get player ID (POST /api/external/getUserID)
 * 7. Reset Player Password (POST /api/external/resetPassword)
 * 8. Force Player Offline (POST /api/external/playerOffline)
 */

export interface GameVaultAddUserResponse {
  code: number;
  msg: string;
  data: {
    account_name: string;
    user_id: string;
  };
  count?: number;
}

export interface GameVaultRechargeResponse {
  code: number;
  msg: string;
  data: {
    agent_balance: string;
    amount: string;
    pay_order_id: string;
    transaction_id: string;
    transaction_time: string;
    user_balance: string;
  };
  count?: number;
}

export interface GameVaultWithdrawResponse {
  code: number;
  msg: string;
  data: {
    agent_balance: string;
    amount: string;
    transaction_id: string;
    transaction_time: string;
    user_balance: string;
    wdw_order_id: string;
  };
  count?: number;
}

export interface GameVaultUserBalanceResponse {
  code: number;
  msg: string;
  data: {
    user_balance: string;
  };
  count?: number;
}

export interface GameVaultGetUserIDResponse {
  code: number;
  msg: string;
  data: {
    user_id: string;
  };
  count?: number;
}

export interface GameVaultApiConfig {
  baseUrl?: string;
  agentId?: string;
  secretKey?: string;
}

export class GameVaultApiClient {
  private baseUrl: string;
  private agentId: string;
  private secretKey: string;

  constructor(config: GameVaultApiConfig = {}) {
    this.baseUrl = (
      config.baseUrl ||
      process.env.GAMEVAULT_API_BASE_URL ||
      process.env.GAMEVAULT_ADMIN_URL?.replace(/\/login.*$/i, "") ||
      "https://agent.gamevault999.com"
    ).replace(/\/+$/, "");

    this.agentId =
      config.agentId ||
      process.env.GAMEVAULT_AGENT_ID ||
      "158408";

    this.secretKey =
      config.secretKey ||
      process.env.GAMEVAULT_SECRET_KEY ||
      "352a22adfdc2675cf6b90e621fa687dd";
  }

  private generateAuthParams(): { agent_id: string; timestamp: string; token: string } {
    const timestamp = String(Math.floor(Date.now() / 1000));
    const rawSig = `${this.agentId}:${timestamp}:${this.secretKey}`;
    const token = createHash("md5").update(rawSig).digest("hex").toLowerCase();
    return {
      agent_id: this.agentId,
      timestamp,
      token,
    };
  }

  private buildFormData(params: Record<string, string | number>): FormData {
    const auth = this.generateAuthParams();
    const formData = new FormData();
    formData.append("agent_id", auth.agent_id);
    formData.append("timestamp", auth.timestamp);
    formData.append("token", auth.token);

    for (const [key, value] of Object.entries(params)) {
      formData.append(key, String(value));
    }
    return formData;
  }

  private async request<T>(endpoint: string, params: Record<string, string | number> = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const body = this.buildFormData(params);

    const proxyUrl =
      process.env.GAMEVAULT_PROXY_URL ||
      process.env.FIXIE_URL ||
      process.env.QUOTAGUARDSTATIC_URL ||
      "http://sbhxwsxp:xn5frycnonl5@198.23.243.226:6361";
    let fetchOptions: any = {
      method: "POST",
      body,
    };

    if (proxyUrl) {
      try {
        const { HttpsProxyAgent } = await import("https-proxy-agent");
        fetchOptions.agent = new HttpsProxyAgent(proxyUrl);
      } catch (e) {}
    }

    const res = await fetch(url, fetchOptions);

    let json: any;
    try {
      json = await res.json();
    } catch (e) {
      throw new Error(`Invalid JSON response from Game Vault API (${res.status} ${res.statusText})`);
    }

    const code = json.code ?? json.status;
    if (code !== 0 && code !== 200) {
      const errorMsg = json.msg || json.message || `Game Vault API error code: ${code}`;
      throw new Error(errorMsg);
    }

    return json as T;
  }

  async getUserID(accountName: string): Promise<string> {
    const res = await this.request<GameVaultGetUserIDResponse>("/api/external/getUserID", {
      account_name: accountName.trim(),
    });
    if (!res.data?.user_id) throw new Error(`User ID not found for account '${accountName}'`);
    return res.data.user_id;
  }

  async resolveUserId(accountOrId: string | number): Promise<string> {
    const strVal = String(accountOrId).trim();
    if (/^\d{5,}$/.test(strVal)) return strVal;
    try {
      return await this.getUserID(strVal);
    } catch {
      return strVal;
    }
  }

  async addUser(account: string, loginPwd: string = "123123"): Promise<GameVaultAddUserResponse> {
    const cleanAccount = account.trim();
    return this.request<GameVaultAddUserResponse>("/api/external/addUser", {
      account: cleanAccount,
      login_pwd: String(loginPwd).trim(),
    });
  }

  async recharge(userIdOrAccount: string | number, amount: number | string, orderId?: string): Promise<GameVaultRechargeResponse> {
    const userId = await this.resolveUserId(userIdOrAccount);
    const order = orderId || `ord_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    return this.request<GameVaultRechargeResponse>("/api/external/recharge", {
      user_id: userId,
      amount: String(amount),
      order_id: order,
    });
  }

  async withdraw(userIdOrAccount: string | number, amount: number | string, orderId?: string): Promise<GameVaultWithdrawResponse> {
    const userId = await this.resolveUserId(userIdOrAccount);
    const order = orderId || `ord_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    return this.request<GameVaultWithdrawResponse>("/api/external/withdraw", {
      user_id: userId,
      amount: String(amount),
      order_id: order,
    });
  }

  async getUserBalance(userIdOrAccount: string | number): Promise<GameVaultUserBalanceResponse> {
    const userId = await this.resolveUserId(userIdOrAccount);
    return this.request<GameVaultUserBalanceResponse>("/api/external/userBalance", {
      user_id: userId,
    });
  }
}

let globalClient: GameVaultApiClient | null = null;
export function getGameVaultApiClient(config?: GameVaultApiConfig): GameVaultApiClient {
  if (config || !globalClient) {
    globalClient = new GameVaultApiClient(config);
  }
  return globalClient;
}
