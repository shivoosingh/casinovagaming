/**
 * CashFrenzy777 Direct REST API Client
 *
 * Official API Integration for agentserver.cashfrenzy777.com.
 * Must exit via whitelisted proxy on Vercel.
 */

import {
  buildMultipart,
  httpsViaProxy,
  parseApiJson,
  resolveGameProxyUrl,
} from "./proxy-http";

export interface CashFrenzyLoginResponse {
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

export interface CashFrenzyPlayer {
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

export interface CashFrenzyPlayerListResponse {
  status_code: number;
  message: string;
  count: number;
  data: CashFrenzyPlayer[];
}

export interface CashFrenzyAddPlayerResponse {
  status_code: number;
  message: string;
  data: {
    account: string;
    password: string;
    balance: string;
    time: string;
  };
}

export interface CashFrenzyGetScoreResponse {
  status_code: number;
  message: string;
  data: {
    username: string;
    balance: number;
    is_game: boolean;
  };
}

export interface CashFrenzyRechargeResponse {
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

export interface CashFrenzyWithdrawResponse {
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

export interface CashFrenzyApiConfig {
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

export class CashFrenzyApiClient {
  private baseUrl: string;
  private agentUsername: string;
  private agentPassword: string;
  private proxyUrl?: string;
  private token: string | null = null;
  private expiresTime: number | null = null;

  constructor(config: CashFrenzyApiConfig = {}) {
    this.baseUrl = (
      config.baseUrl ||
      process.env.CASHFRENZY_API_BASE_URL ||
      process.env.CASHFRENZY_ADMIN_URL?.replace(/\/admin.*$/i, "") ||
      "https://agentserver.cashfrenzy777.com"
    ).replace(/\/+$/, "");

    this.agentUsername =
      config.username ||
      process.env.CASHFRENZY_AGENT_USERNAME ||
      process.env.CASHFRENZY_USERNAME ||
      "Funstorr111";

    this.agentPassword =
      config.password ||
      process.env.CASHFRENZY_AGENT_PASSWORD ||
      process.env.CASHFRENZY_PASSWORD ||
      "Fun@123@";

    this.proxyUrl =
      config.proxyUrl || resolveGameProxyUrl("CASHFRENZY_PROXY_URL", "MRALLINONE_PROXY_URL");
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
      "CashFrenzy API"
    );
    const json = parseApiJson(text, statusCode, "CashFrenzy API");

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

  async getAgentBalance(username?: string, password?: string): Promise<number> {
    const user = username || this.agentUsername;
    const pass = password || this.agentPassword;

    if (!user || !pass) {
      throw new Error("CashFrenzy agent credentials missing.");
    }

    const res = await this.request<CashFrenzyLoginResponse>(
      "/api/agent/login",
      { method: "POST", form: { username: user, password: pass } },
      false
    );

    if (!res.data?.token) {
      throw new Error(res.message || "Store login failed: no token returned");
    }

    this.token = res.data.token;
    this.expiresTime = res.data.expires_time || Math.floor(Date.now() / 1000) + 3600;
    return parseFloat(String(res.data.money ?? "0")) || 0;
  }

  async getPlayerList(limit: number = 50, page: number = 1): Promise<CashFrenzyPlayerListResponse> {
    const params = new URLSearchParams({ limit: String(limit), page: String(page) });
    return this.request<CashFrenzyPlayerListResponse>(`/api/player/playerList?${params.toString()}`);
  }

  async findPlayerByAccount(accountOrId: string | number): Promise<CashFrenzyPlayer | null> {
    const target = String(accountOrId).trim().toLowerCase();
    let listRes = await this.getPlayerList(100, 1);
    let match = listRes.data?.find((p) => p.Account.toLowerCase() === target || String(p.id) === target);
    if (match) return match;

    const totalCount = listRes.count || 0;
    const maxPages = Math.ceil(totalCount / 100);
    for (let p = 2; p <= Math.min(maxPages, 10); p++) {
      listRes = await this.getPlayerList(100, p);
      match = listRes.data?.find((player) => player.Account.toLowerCase() === target || String(player.id) === target);
      if (match) return match;
    }

    return null;
  }

  async resolvePlayerId(accountOrId: string | number): Promise<string> {
    const strVal = String(accountOrId).trim();
    const player = await this.findPlayerByAccount(strVal);
    if (player) return String(player.id);
    if (/^\d+$/.test(strVal)) return strVal;
    throw new Error(`Player '${strVal}' not found on CashFrenzy agent account.`);
  }

  async addPlayer(
    username: string,
    password: string = "123456",
    nickname?: string,
    money: string | number = "0"
  ): Promise<CashFrenzyAddPlayerResponse> {
    const cleanUser = username.trim();
    let cleanNick = (nickname && nickname !== "-" ? nickname : cleanUser).replace(/[^a-zA-Z0-9]/g, "").slice(0, 20);
    if (!cleanNick) cleanNick = "User" + Math.floor(1000 + Math.random() * 9000);

    return this.request<CashFrenzyAddPlayerResponse>("/api/player/insertPlayer", {
      method: "POST",
      form: {
        username: cleanUser,
        nickname: cleanNick,
        password: String(password).trim(),
        money: String(money),
      },
    });
  }

  async getPlayerScore(idOrAccount: string | number): Promise<CashFrenzyGetScoreResponse> {
    const id = await this.resolvePlayerId(idOrAccount);
    const params = new URLSearchParams({ id });
    return this.request<CashFrenzyGetScoreResponse>(`/api/player/getScore?${params.toString()}`);
  }

  async rechargePlayer(
    idOrAccount: string | number,
    balance: number | string,
    remark: string = "webrecharge"
  ): Promise<CashFrenzyRechargeResponse> {
    const id = await this.resolvePlayerId(idOrAccount);
    const cleanRemark = (remark || "webrecharge").replace(/[^a-zA-Z0-9]/g, "").slice(0, 50) || "webrecharge";

    return this.request<CashFrenzyRechargeResponse>("/api/player/playerRecharge", {
      method: "POST",
      form: { id, balance: String(balance), remark: cleanRemark },
    });
  }

  async withdrawPlayer(
    idOrAccount: string | number,
    balance: number | string,
    remark: string = "webwithdraw"
  ): Promise<CashFrenzyWithdrawResponse> {
    const id = await this.resolvePlayerId(idOrAccount);
    const cleanRemark = (remark || "webwithdraw").replace(/[^a-zA-Z0-9]/g, "").slice(0, 50) || "webwithdraw";

    return this.request<CashFrenzyWithdrawResponse>("/api/player/playerWithdraw", {
      method: "POST",
      form: { id, balance: String(balance), remark: cleanRemark },
    });
  }
}

let globalClient: CashFrenzyApiClient | null = null;
export function getCashFrenzyApiClient(config?: CashFrenzyApiConfig): CashFrenzyApiClient {
  if (config || !globalClient) {
    globalClient = new CashFrenzyApiClient(config);
  }
  return globalClient;
}
