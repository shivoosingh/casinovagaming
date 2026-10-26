/**
 * Mafia Direct REST API Client
 *
 * Official API Integration for agentserver.mafia77777.com.
 * Must exit via whitelisted proxy on Vercel.
 */

import { httpsViaProxy, parseApiJson, resolveGameProxyUrl } from "./proxy-http";

export interface MafiaLoginResponse {
  status_code: number;
  message: string;
  data: {
    userName: string;
    money: string;
    token: string;
    expires_time: number;
  };
}

export interface MafiaPlayer {
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

export interface MafiaPlayerListResponse {
  status_code: number;
  message: string;
  count: number;
  data: MafiaPlayer[];
}

export interface MafiaAddPlayerResponse {
  status_code: number;
  message: string;
  data: {
    id: number;
    account: string;
    password: string;
    balance: string;
    time: string;
  };
}

export interface MafiaRechargeResponse {
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

export interface MafiaWithdrawResponse {
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

export interface MafiaConfig {
  baseUrl?: string;
  username?: string;
  password?: string;
  proxyUrl?: string;
}

export class MafiaApiClient {
  private baseUrl: string;
  private username: string;
  private password: string;
  private proxyUrl?: string;
  private token: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor(config: MafiaConfig = {}) {
    this.baseUrl = (
      config.baseUrl ||
      process.env.MAFIA_ADMIN_URL ||
      "https://agentserver.mafia77777.com"
    ).replace(/\/admin\/login\/?$/, "").replace(/\/+$/, "");

    this.username =
      config.username ||
      process.env.MAFIA_AGENT_USERNAME ||
      "Romc12mf";

    this.password =
      config.password ||
      process.env.MAFIA_AGENT_PASSWORD ||
      "Reset123@";

    this.proxyUrl = config.proxyUrl || resolveGameProxyUrl("MAFIA_PROXY_URL", "MRALLINONE_PROXY_URL");
  }

  private async requestJson<T>(
    method: "GET" | "POST",
    path: string,
    body?: Record<string, unknown>,
    requiresAuth = true
  ): Promise<T> {
    const headers: Record<string, string> = {};
    if (requiresAuth) {
      headers.Authorization = `Bearer ${await this.getValidToken()}`;
    }

    let bodyBuffer: Buffer | null = null;
    if (body) {
      const raw = JSON.stringify(body);
      headers["Content-Type"] = "application/json";
      bodyBuffer = Buffer.from(raw, "utf8");
    }

    const { text, statusCode } = await httpsViaProxy(
      method,
      `${this.baseUrl}${path}`,
      headers,
      bodyBuffer,
      this.proxyUrl,
      20000,
      "Mafia API"
    );
    return parseApiJson(text, statusCode, "Mafia API") as T;
  }

  public async getValidToken(): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    if (this.token && this.tokenExpiresAt > now + 60) {
      return this.token;
    }
    await this.getAgentBalance();
    if (!this.token) throw new Error("Mafia login authentication failed: no token");
    return this.token;
  }

  public async getAgentBalance(): Promise<number> {
    const now = Math.floor(Date.now() / 1000);
    const json = await this.requestJson<MafiaLoginResponse>(
      "POST",
      "/api/agent/login",
      { username: this.username, password: this.password },
      false
    );
    if (json.status_code !== 200 || !json.data?.token) {
      throw new Error(`Mafia login authentication failed: ${json.message || "Unknown error"}`);
    }

    this.token = json.data.token;
    this.tokenExpiresAt = json.data.expires_time || now + 3600;
    return parseFloat(String(json.data.money ?? "0")) || 0;
  }

  public async getPlayerList(page = 1, limit = 50, searchAccount?: string): Promise<MafiaPlayer[]> {
    let path = `/api/player/playerList?page=${page}&limit=${limit}`;
    if (searchAccount?.trim()) {
      path += `&account=${encodeURIComponent(searchAccount.trim())}`;
    }

    const json = await this.requestJson<MafiaPlayerListResponse>("GET", path);
    if (json.status_code !== 200) {
      throw new Error(`Mafia getPlayerList error: ${json.message}`);
    }

    return json.data || [];
  }

  public async findPlayerByAccount(account: string): Promise<MafiaPlayer | null> {
    const target = account.trim();
    if (!target) return null;
    if (/^\d+$/.test(target)) {
      return { id: Number(target), Account: target } as MafiaPlayer;
    }

    const { getCachedPlayerId, cachePlayerId } = await import("./layui-player-resolve");
    const cached = getCachedPlayerId("mafia", target);
    if (cached) return { id: Number(cached), Account: target } as MafiaPlayer;

    const players = await this.getPlayerList(1, 10, target);
    const match = players.find(
      (p) =>
        p.Account.trim().toLowerCase() === target.toLowerCase() ||
        p.nickname.trim().toLowerCase() === target.toLowerCase()
    );
    if (match) cachePlayerId("mafia", target, match.id);
    return match || null;
  }

  public async createAccount(account: string, pass: string): Promise<{ id: number; account: string; pass: string }> {
    const json = await this.requestJson<MafiaAddPlayerResponse>("POST", "/api/player/insertPlayer", {
      username: account,
      password: pass,
    });
    if (json.status_code !== 200) {
      throw new Error(`Mafia createAccount error: ${json.message}`);
    }

    const { cachePlayerId } = await import("./layui-player-resolve");
    if (json.data?.id) cachePlayerId("mafia", json.data.account || account, json.data.id);

    return {
      id: json.data.id,
      account: json.data.account || account,
      pass: json.data.password || pass,
    };
  }

  public async rechargePlayer(account: string, amount: number): Promise<{ game_id: number; balance: number }> {
    let player = await this.findPlayerByAccount(account);
    if (!player) {
      const created = await this.createAccount(account, "123123");
      player = { id: created.id, Account: created.account } as MafiaPlayer;
    }

    const json = await this.requestJson<MafiaRechargeResponse>("POST", "/api/player/playerRecharge", {
      id: player.id,
      balance: String(amount),
    });
    if (json.status_code !== 200) {
      throw new Error(`Mafia rechargePlayer error: ${json.message}`);
    }

    return {
      game_id: json.data.game_id,
      balance: json.data.balance,
    };
  }

  public async withdrawPlayer(account: string, amount: number): Promise<{ game_id: number; balance: number }> {
    const player = await this.findPlayerByAccount(account);
    if (!player) {
      throw new Error(`Player ${account} not found on Mafia agent panel`);
    }

    const json = await this.requestJson<MafiaWithdrawResponse>("POST", "/api/player/playerWithdraw", {
      id: player.id,
      balance: String(amount),
    });
    if (json.status_code !== 200) {
      throw new Error(`Mafia withdrawPlayer error: ${json.message}`);
    }

    return {
      game_id: json.data.game_id,
      balance: json.data.balance,
    };
  }
}

export function isMafiaApiConfigured(): boolean {
  const username = process.env.MAFIA_AGENT_USERNAME || "Romc12mf";
  const password = process.env.MAFIA_AGENT_PASSWORD || "Reset123@";
  return Boolean(username?.trim() && password?.trim());
}
