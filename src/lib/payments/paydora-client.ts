const DEVICE_KEY = "casinova-device-id";

/** Stable id for this browser. Paydora requires 8–128 letters, numbers, - or _. */
export function deviceFingerprint(): string {
  try {
    const saved = localStorage.getItem(DEVICE_KEY);
    if (saved && /^[A-Za-z0-9_-]{8,128}$/.test(saved)) return saved;
  } catch {
    // Private mode can block storage. A fresh id still satisfies the payment check.
  }

  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const id = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  try {
    localStorage.setItem(DEVICE_KEY, id);
  } catch {
    // The id is still valid for this checkout.
  }
  return id;
}

function isPublicIp(value: string): boolean {
  const ip = value.trim().replace(/^\[|\]$/g, "");
  if (!ip || ip.includes(",")) return false;
  if (ip.includes(":")) {
    const lower = ip.toLowerCase().split("%")[0];
    if (lower === "::1" || lower === "::") return false;
    if (lower.startsWith("fc") || lower.startsWith("fd") || lower.startsWith("fe80")) return false;
    return /^[0-9a-f:]+$/i.test(lower);
  }
  const parts = ip.split(".");
  if (parts.length !== 4) return false;
  const nums = parts.map((part) => Number(part));
  if (nums.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  const [a, b] = nums;
  if (a === 0 || a === 10 || a === 127) return false;
  if (a === 169 && b === 254) return false;
  if (a === 192 && b === 168) return false;
  if (a === 172 && b >= 16 && b <= 31) return false;
  return true;
}

/**
 * The player's public address, not the server's.
 * Cloudflare's header is overwritten by the proxy, so it wins.
 * Otherwise take the rightmost public address in X-Forwarded-For.
 */
export function paydoraCustomerIp(req: Request): string | null {
  const cloudflare = req.headers.get("cf-connecting-ip")?.trim();
  if (cloudflare && isPublicIp(cloudflare)) return cloudflare.replace(/^\[|\]$/g, "");

  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded.split(",").map((part) => part.trim()).filter(Boolean);
    for (let i = parts.length - 1; i >= 0; i -= 1) {
      if (isPublicIp(parts[i])) return parts[i].replace(/^\[|\]$/g, "");
    }
  }

  const real = req.headers.get("x-real-ip")?.trim();
  if (real && isPublicIp(real)) return real.replace(/^\[|\]$/g, "");
  return null;
}
