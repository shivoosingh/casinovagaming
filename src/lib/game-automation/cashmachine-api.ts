/**
 * CashMachine777 Direct REST API Client
 *
 * Official API Integration for agentserver.cashmachine777.com.
 * Must exit via whitelisted proxy on Vercel.
 */

import {
  buildMultipart,
  httpsViaProxy,
  parseApiJson,
  resolveGameProxyUrl,
} from "./proxy-http";

export interface CashMachineLoginResponse {
  status_code: number;
  message: string;
  data: {
    userName: string;
    nickname: string;
    money: string;
    token: string;
    expires_time: number;
  };
}

export interface CashMachinePlayer {
  Account: string;
  nickname: string;
  AddDate: string;
  LoginCount: number;
  lasttime: string;
  loginip: string;
  account_using: number;
  id: number;
  score: number;
}

export interface CashMachinePlayerListResponse {
  status_code: number;
  message: string;
  count: number;
  data: CashMachinePlayer[];
}

export interface CashMachineAddPlayerResponse {
  status_code: number;
  message: string;
  data: {
    account: string;
    password: string;
    balance: string;
    time: string;
  };
}

export interface CashMachineGetScoreResponse {
  status_code: number;
  message: string;
  data: {
    username: string;
    balance: number;
    is_game: boolean;
  };
}

export interface CashMachineRechargeResponse {
  status_code: number;
  message: string;
  data: {
    game_id: number;
    username: string;
    balance: number;
    remark: string;
    time: string;
  };
}

export interface CashMachineWithdrawResponse {
  status_code: number;
  message: string;
  data: {
    game_id: number;
    username: string;
    balance: number;
    remark: string;
    time: string;
  };
}

export interface CashMachineApiConfig {
  baseUrl?: string;
  username?: string;
  password?: string;
  proxyUrl?: string;
}

type ApiRequestOptions = {
  method?: "GET" | "POST";
  form?: Record<string, string | number>;
  _isRetry?: boolean;
};

export class CashMachineApiClient {
  private baseUrl: string;
  private agentUsername: string;
  private agentPassword: string;
  private proxyUrl?: string;
  private token: string | null = null;
  private expiresTime: number | null = null;

  constructor(config: CashMachineApiConfig = {}) {
    this.baseUrl = (
      config.baseUrl ||
      process.env.CASHMACHINE_API_BASE_URL ||
      process.env.CASHMACHINE_ADMIN_URL?.replace(/\/admin.*$/i, "") ||
      "https://agentserver.cashmachine777.com"
    ).replace(/\/+$/, "");

    this.agentUsername =
      config.username ||
      process.env.CASHMACHINE_AGENT_USERNAME ||
      process.env.CASHMACHINE_USERNAME ||
      "Cashmachine98";

    this.agentPassword =
      config.password ||
      process.env.CASHMACHINE_AGENT_PASSWORD ||
      process.env.CASHMACHINE_PASSWORD ||
      "David@123#";

    this.proxyUrl =
      config.proxyUrl || resolveGameProxyUrl("CASHMACHINE_PROXY_URL", "MRALLINONE_PROXY_URL");
  }

  private async ensureAuthenticated(): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    if (this.token && this.expiresTime && this.expiresTime - now > 60) {
      return this.token;
    }
    return this.login();
  }

  private async request<T>(
    endpoint: string,
    options: ApiRequestOptions = {},
    requiresAuth = true
  ): Promise<T> {
    const method = options.method || (options.form ? "POST" : "GET");
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {};

    if (requiresAuth) {
      headers.Authorization = `Bearer ${await this.ensureAuthenticated()}`;
    }

    let bodyBuffer: Buffer | null = null;
    if (options.form) {
      const fields: Record<string, string> = {};
      for (const [k, v] of Object.entries(options.form)) fields[k] = String(v);
      const multipart = buildMultipart(fields);
      headers["Content-Type"] = `multipart/form-data; boundary=${multipart.boundary}`;
      bodyBuffer = multipart.body;
    }

    const { text, statusCode } = await httpsViaProxy(
      method,
      url,
      headers,
      bodyBuffer,
      this.proxyUrl,
      20000,
      "CashMachine API"
    );
    const json = parseApiJson(text, statusCode, "CashMachine API");

    const code = json.status_code ?? json.code ?? statusCode;
    if (code !== 200) {
      const errorMsg = json.message || json.msg || `API call failed with status ${code}`;
      if (code === 401 && requiresAuth && !options._isRetry) {
        this.token = null;
        this.expiresTime = null;
        return this.request<T>(endpoint, { ...options, _isRetry: true }, true);
      }
      throw new Error(errorMsg);
    }

    return json as T;
  }

  async login(username?: string, password?: string): Promise<string> {
    await this.getAgentBalance(username, password);
    if (!this.token) throw new Error("Store login failed: no token returned");
    return this.token;
  }

  private parseMoney(value: unknown): number {
    if (value == null) return 0;
    const n = parseFloat(String(value).replace(/,/g, "").trim());
    return Number.isFinite(n) ? n : 0;
  }

  async getAgentBalance(username?: string, password?: string): Promise<number> {
    const user = username || this.agentUsername;
    const pass = password || this.agentPassword;

    if (!user || !pass) {
      throw new Error(
        "CashMachine agent credentials missing. Please set CASHMACHINE_AGENT_USERNAME and CASHMACHINE_AGENT_PASSWORD in environment."
      );
    }

    const res = await this.request<CashMachineLoginResponse>(
      "/api/agent/login",
      { method: "POST", form: { username: user, password: pass } },
      false
    );

    if (!res.data?.token) {
      throw new Error(res.message || "Store login failed: no token returned");
    }

    this.token = res.data.token;
    this.expiresTime = res.data.expires_time || Math.floor(Date.now() / 1000) + 3600;

    // Panel header uses POST /api/agent/getMoney (login `money` can be stale/zero).
    try {
      const { text, statusCode } = await httpsViaProxy(
        "POST",
        `${this.baseUrl}/api/agent/getMoney`,
        { Authorization: `Bearer ${this.token}` },
        null,
        this.proxyUrl,
        15000,
        "CashMachine getMoney"
      );
      const json = parseApiJson(text, statusCode, "CashMachine getMoney");
      const code = json.status_code ?? json.code ?? statusCode;
      if (code === 200 && json.data != null && json.data !== "") {
        return this.parseMoney(json.data);
      }
    } catch {
      // fall back to login money
    }

    return this.parseMoney(res.data.money);
  }

  /**
   * 1.2 Get player list
   * GET /api/player/playerList?limit=10&page=1
   */
  async getPlayerList(
    limit: number = 50,
    page: number = 1,
    extra: Record<string, string> = {}
  ): Promise<CashMachinePlayerListResponse> {
    const params = new URLSearchParams({
      limit: String(limit),
      page: String(page),
      ...extra,
    });
    return this.request<CashMachinePlayerListResponse>(`/api/player/playerList?${params.toString()}`);
  }

  async findPlayerByAccount(accountOrId: string | number): Promise<CashMachinePlayer | null> {
    const strVal = String(accountOrId).trim();
    if (/^\d+$/.test(strVal)) {
      return { id: Number(strVal), Account: strVal } as CashMachinePlayer;
    }
    try {
      const id = await this.resolvePlayerId(strVal);
      return { id: Number(id), Account: strVal } as CashMachinePlayer;
    } catch {
      return null;
    }
  }

  async resolvePlayerId(accountOrId: string | number): Promise<string> {
    const { resolveLayuiPlayerId } = await import("./layui-player-resolve");
    return resolveLayuiPlayerId({
      agentKey: "cashmachine",
      accountOrId,
      fetchList: async (params) => {
        const limit = Number(params.limit || 20);
        const page = Number(params.page || 1);
        const { limit: _l, page: _p, ...extra } = params;
        return this.getPlayerList(limit, page, extra);
      },
    });
  }

  /**
   * 1.3 Add player
   * POST /api/player/insertPlayer
   */
  async addPlayer(
    username: string,
    password: string = "123456",
    nickname?: string,
    money: string | number = "0"
  ): Promise<CashMachineAddPlayerResponse> {
    const cleanUser = username.trim();
    let cleanNick = (nickname && nickname !== "-" ? nickname : cleanUser)
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(0, 20);
    if (!cleanNick) cleanNick = "User" + Math.floor(1000 + Math.random() * 9000);

    return this.request<CashMachineAddPlayerResponse>("/api/player/insertPlayer", {
      method: "POST",
      form: {
        username: cleanUser,
        nickname: cleanNick,
        password: String(password).trim(),
        money: String(money),
      },
    });
  }

  /**
   * 1.4 Get player scores
   * GET /api/player/getScore?id=13537
   */
  async getPlayerScore(idOrAccount: string | number): Promise<CashMachineGetScoreResponse> {
    const id = await this.resolvePlayerId(idOrAccount);
    const params = new URLSearchParams({ id });
    return this.request<CashMachineGetScoreResponse>(`/api/player/getScore?${params.toString()}`);
  }

  /**
   * 1.5 Player recharge
   * POST /api/player/playerRecharge
   */
  async rechargePlayer(
    idOrAccount: string | number,
    balance: number | string,
    remark: string = "webrecharge"
  ): Promise<CashMachineRechargeResponse> {
    const id = await this.resolvePlayerId(idOrAccount);
    const cleanRemark = (remark || "webrecharge")
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(0, 50) || "webrecharge";

    return this.request<CashMachineRechargeResponse>("/api/player/playerRecharge", {
      method: "POST",
      form: {
        id,
        balance: String(balance),
        remark: cleanRemark,
      },
    });
  }

  /**
   * 1.6 Player withdrawal
   * POST /api/player/playerWithdraw
   */
  async withdrawPlayer(
    idOrAccount: string | number,
    balance: number | string,
    remark: string = "webwithdraw"
  ): Promise<CashMachineWithdrawResponse> {
    const id = await this.resolvePlayerId(idOrAccount);
    const cleanRemark = (remark || "webwithdraw")
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(0, 50) || "webwithdraw";

    return this.request<CashMachineWithdrawResponse>("/api/player/playerWithdraw", {
      method: "POST",
      form: {
        id,
        balance: String(balance),
        remark: cleanRemark,
      },
    });
  }
}

/** Singleton instance helper */
let globalClient: CashMachineApiClient | null = null;

export function getCashMachineApiClient(config?: CashMachineApiConfig): CashMachineApiClient {
  if (config || !globalClient) {
    globalClient = new CashMachineApiClient(config);
  }
  return globalClient;
}
