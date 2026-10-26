import { createHash } from "crypto";
import https from "https";
import tls from "tls";
import net from "net";
import { URL } from "url";

/** Shared residential proxy used by Juwa / Vegas / GameVault / MR family. */
export function resolveGameProxyUrl(...preferredKeys: string[]): string | undefined {
  const keys = [
    ...preferredKeys,
    "GAMEVAULT_PROXY_URL",
    "JUWA_PROXY_URL",
    "VEGAS_PROXY_URL",
    "MRALLINONE_PROXY_URL",
  ];
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return undefined;
}

export function cleanChunkedResponse(text: string): string {
  const s = text.trim();
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) return s.slice(start, end + 1);
  return s;
}

export function buildMultipart(formData: Record<string, string>): { boundary: string; body: Buffer } {
  const boundary =
    "----WebKitFormBoundary" + createHash("md5").update(Date.now().toString()).digest("hex").slice(0, 16);
  const parts: Buffer[] = [];
  for (const [k, v] of Object.entries(formData)) {
    parts.push(
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`, "utf8")
    );
  }
  parts.push(Buffer.from(`--${boundary}--\r\n`, "utf8"));
  return { boundary, body: Buffer.concat(parts) };
}

export function parseApiJson(text: string, statusCode: number, label: string): any {
  const cleaned = cleanChunkedResponse(text);
  try {
    return JSON.parse(cleaned);
  } catch {
    const snippet = text.replace(/\s+/g, " ").trim().slice(0, 160);
    if (statusCode === 502 || /502\s*Bad Gateway/i.test(text)) {
      throw new Error(
        `${label} provider is temporarily down (502 Bad Gateway). Retry in a minute — this is not an invalid account/password.`
      );
    }
    if (statusCode === 503 || /503\s*Service/i.test(text)) {
      throw new Error(`${label} provider unavailable (503). Retry shortly.`);
    }
    if (statusCode >= 500) {
      throw new Error(`${label} server error (HTTP ${statusCode}): ${snippet || "empty response"}`);
    }
    throw new Error(`${label} returned non-JSON (HTTP ${statusCode}): ${snippet || "empty response"}`);
  }
}

/**
 * HTTPS request with optional HTTP CONNECT proxy (required for whitelisted agent IPs on Vercel).
 */
export function httpsViaProxy(
  method: "GET" | "POST",
  targetUrlStr: string,
  headers: Record<string, string>,
  bodyBuffer: Buffer | null,
  proxyUrlStr?: string,
  timeoutMs = 20000,
  label = "Game API"
): Promise<{ text: string; statusCode: number }> {
  return new Promise((resolve, reject) => {
    try {
      const targetUrl = new URL(targetUrlStr);
      const timer = setTimeout(
        () => reject(new Error(`${label} timed out after ${Math.round(timeoutMs / 1000)}s`)),
        timeoutMs
      );
      const finish = (text: string, statusCode: number) => {
        clearTimeout(timer);
        resolve({ text, statusCode });
      };

      const writeRequest = (socket: tls.TLSSocket) => {
        const reqPath = targetUrl.pathname + targetUrl.search;
        let httpReq =
          `${method} ${reqPath} HTTP/1.1\r\n` +
          `Host: ${targetUrl.hostname}\r\n` +
          `User-Agent: Mozilla/5.0\r\n` +
          `Connection: close\r\n`;
        for (const [k, v] of Object.entries(headers)) {
          httpReq += `${k}: ${v}\r\n`;
        }
        if (bodyBuffer) httpReq += `Content-Length: ${bodyBuffer.length}\r\n`;
        httpReq += `\r\n`;
        socket.write(httpReq);
        if (bodyBuffer) socket.write(bodyBuffer);

        let resText = "";
        socket.on("data", (data: Buffer) => (resText += data.toString("utf8")));
        socket.on("end", () => {
          const parts = resText.split("\r\n\r\n");
          const head = parts[0] || "";
          const body = parts.slice(1).join("\r\n\r\n");
          const statusMatch = head.match(/HTTP\/\d\.\d\s+(\d+)/i);
          finish(body, statusMatch ? parseInt(statusMatch[1], 10) : 200);
        });
        socket.on("error", (e: Error) => {
          clearTimeout(timer);
          reject(e);
        });
      };

      if (proxyUrlStr) {
        const proxyUrl = new URL(proxyUrlStr);
        const targetHost = targetUrl.hostname;
        const targetPort = targetUrl.port ? Number(targetUrl.port) : 443;
        const proxyAuth =
          proxyUrl.username && proxyUrl.password
            ? Buffer.from(
                `${decodeURIComponent(proxyUrl.username)}:${decodeURIComponent(proxyUrl.password)}`
              ).toString("base64")
            : null;

        const socket = net.connect(Number(proxyUrl.port || 80), proxyUrl.hostname, () => {
          let connectReq =
            `CONNECT ${targetHost}:${targetPort} HTTP/1.1\r\n` + `Host: ${targetHost}:${targetPort}\r\n`;
          if (proxyAuth) connectReq += `Proxy-Authorization: Basic ${proxyAuth}\r\n`;
          connectReq += `\r\n`;
          socket.write(connectReq);
        });

        let connectHeaderBuf = "";
        let established = false;
        socket.on("data", function onData(chunk: Buffer) {
          if (established) return;
          connectHeaderBuf += chunk.toString("utf8");
          if (!connectHeaderBuf.includes("\r\n\r\n")) return;
          const firstLine = connectHeaderBuf.split("\r\n")[0];
          if (!/HTTP\/\d\.\d\s+200/i.test(firstLine)) {
            clearTimeout(timer);
            reject(new Error(`Proxy CONNECT failed: ${firstLine}`));
            return;
          }
          established = true;
          socket.removeListener("data", onData);
          const tlsSocket = tls.connect(
            { socket, servername: targetHost, rejectUnauthorized: false },
            () => writeRequest(tlsSocket)
          );
          tlsSocket.on("error", (e) => {
            clearTimeout(timer);
            reject(e);
          });
        });
        socket.on("error", (e) => {
          if (!established) {
            clearTimeout(timer);
            reject(e);
          }
        });
        return;
      }

      const options: https.RequestOptions = {
        hostname: targetUrl.hostname,
        port: targetUrl.port || 443,
        path: targetUrl.pathname + targetUrl.search,
        method,
        headers: {
          Host: targetUrl.hostname,
          "User-Agent": "Mozilla/5.0",
          Connection: "close",
          ...headers,
          ...(bodyBuffer ? { "Content-Length": bodyBuffer.length } : {}),
        },
        rejectUnauthorized: false,
      };

      const req = https.request(options, (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => finish(Buffer.concat(chunks).toString("utf8"), res.statusCode || 0));
      });
      req.on("error", (e) => {
        clearTimeout(timer);
        reject(e);
      });
      if (bodyBuffer) req.write(bodyBuffer);
      req.end();
    } catch (e) {
      reject(e);
    }
  });
}
