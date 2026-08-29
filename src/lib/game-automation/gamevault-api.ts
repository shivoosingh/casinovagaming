import { createHash } from "crypto";
import https from "https";
import tls from "tls";
import net from "net";
import { URL } from "url";

/**
 * Game Vault Direct REST API Client
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
  proxyUrl?: string;
}

/**
 * Execute form-encoded HTTPS POST via HTTP CONNECT proxy tunnel
 */
function httpsPostFormViaProxy(
  targetUrlStr: string,
  formData: Record<string, string>,
  proxyUrlStr?: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const targetUrl = new URL(targetUrlStr);

      const bodyParams = new URLSearchParams();
      for (const [k, v] of Object.entries(formData)) {
        bodyParams.append(k, v);
      }
      const bodyStr = bodyParams.toString();

      if (proxyUrlStr) {
        const proxyUrl = new URL(proxyUrlStr);
        const targetHost = targetUrl.hostname;
        const targetPort = targetUrl.port ? Number(targetUrl.port) : 443;

        const proxyHost = proxyUrl.hostname;
        const proxyPort = Number(proxyUrl.port || 80);

        const proxyAuth = proxyUrl.username && proxyUrl.password
          ? Buffer.from(`${decodeURIComponent(proxyUrl.username)}:${decodeURIComponent(proxyUrl.password)}`).toString("base64")
          : null;

        const socket = net.connect(proxyPort, proxyHost, () => {
          let connectReq = `CONNECT ${targetHost}:${targetPort} HTTP/1.1\r\n` +
            `Host: ${targetHost}:${targetPort}\r\n`;

          if (proxyAuth) {
            connectReq += `Proxy-Authorization: Basic ${proxyAuth}\r\n`;
          }

          connectReq += `\r\n`;
          socket.write(connectReq);
        });

        let connectHeaderBuf = "";
        let isTunnelEstablished = false;

        socket.on("data", onSocketData);
        socket.on("error", (err) => {
          if (!isTunnelEstablished) reject(err);
        });

        function onSocketData(chunk: Buffer) {
          if (isTunnelEstablished) return;

          connectHeaderBuf += chunk.toString("utf8");
          if (connectHeaderBuf.includes("\r\n\r\n")) {
            const firstLine = connectHeaderBuf.split("\r\n")[0];
            if (/HTTP\/\d\.\d\s+200/i.test(firstLine)) {
              isTunnelEstablished = true;
              socket.removeListener("data", onSocketData);

              const tlsOptions = {
                socket: socket,
                servername: targetHost,
                rejectUnauthorized: false,
              };

              const tlsSocket = tls.connect(tlsOptions, () => {
                const reqPath = targetUrl.pathname + targetUrl.search;
                let httpReq = `POST ${reqPath} HTTP/1.1\r\n` +
                  `Host: ${targetHost}\r\n` +
                  `User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36\r\n` +
                  `Content-Type: application/x-www-form-urlencoded\r\n` +
                  `Content-Length: ${Buffer.byteLength(bodyStr)}\r\n` +
                  `Connection: close\r\n\r\n` +
                  bodyStr;

                tlsSocket.write(httpReq);
              });

              let resText = "";
              tlsSocket.on("data", (data: Buffer) => (resText += data.toString("utf8")));
              tlsSocket.on("end", () => {
                const parts = resText.split("\r\n\r\n");
                const body = parts.slice(1).join("\r\n\r\n");
                resolve(body);
              });

              tlsSocket.on("error", (e: any) => reject(e));
            } else {
              reject(new Error(`Proxy CONNECT failed: ${firstLine}`));
            }
          }
        }
        return;
      }

      // Direct fallback
      const options: https.RequestOptions = {
        hostname: targetUrl.hostname,
        port: targetUrl.port ? Number(targetUrl.port) : 443,
        path: targetUrl.pathname + targetUrl.search,
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": Buffer.byteLength(bodyStr),
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        rejectUnauthorized: false,
      };

      const req = https.request(options, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve(data));
      });

      req.on("error", (e) => reject(e));
      req.write(bodyStr);
      req.end();
    } catch (err) {
      reject(err);
    }
  });
}

export class GameVaultApiClient {
  private baseUrl: string;
  private agentId: string;
  private secretKey: string;
  private proxyUrl?: string;

  constructor(config: GameVaultApiConfig = {}) {
    this.baseUrl = (
      config.baseUrl ||
      process.env.GAMEVAULT_API_BASE_URL ||
      process.env.GAMEVAULT_ADMIN_URL?.replace(/\/login.*$/i, "") ||
      "https://agent.gamevault999.com"
    ).replace(/\/+$/, "");

    this.agentId = (
      config.agentId ||
      process.env.GAMEVAULT_AGENT_ID ||
      "158408"
    ).trim();

    this.secretKey = (
      config.secretKey ||
      process.env.GAMEVAULT_SECRET_KEY ||
      "352a22adfdc2675cf6b90e621fa687dd"
    ).trim();

    this.proxyUrl = (
      config.proxyUrl ||
      process.env.GAMEVAULT_PROXY_URL ||
      "http://sbhxwsxp:xn5frycnonl5@198.23.243.226:6361"
    ).trim();
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

  private async request<T>(endpoint: string, params: Record<string, string | number> = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const auth = this.generateAuthParams();

    const formData: Record<string, string> = {
      agent_id: auth.agent_id,
      timestamp: auth.timestamp,
      token: auth.token,
    };

    for (const [key, value] of Object.entries(params)) {
      formData[key] = String(value);
    }

    const text = await httpsPostFormViaProxy(url, formData, this.proxyUrl);

    let json: any;
    try {
      json = JSON.parse(text);
    } catch (e) {
      throw new Error(`Invalid JSON response from Game Vault API: ${text.slice(0, 200)}`);
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
