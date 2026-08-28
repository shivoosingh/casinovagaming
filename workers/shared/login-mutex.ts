import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const WORKERS_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LOCK_PATH = path.join(WORKERS_ROOT, ".login.lock");
const STALE_MS = 180_000; // 3 min — CAPTCHA solve can take a while

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function readLock(): { pid: number; at: number } | null {
  try {
    const raw = fs.readFileSync(LOCK_PATH, "utf8").trim();
    const [pidStr, atStr] = raw.split("\n");
    const pid = Number(pidStr);
    const at = Number(atStr);
    if (!Number.isFinite(pid) || !Number.isFinite(at)) return null;
    return { pid, at };
  } catch {
    return null;
  }
}

function tryAcquire(owner: string): boolean {
  try {
    fs.writeFileSync(LOCK_PATH, `${process.pid}\n${Date.now()}\n${owner}\n`, { flag: "wx" });
    return true;
  } catch {
    const existing = readLock();
    if (existing && Date.now() - existing.at > STALE_MS) {
      try {
        fs.unlinkSync(LOCK_PATH);
      } catch {
        /* ignore */
      }
      try {
        fs.writeFileSync(LOCK_PATH, `${process.pid}\n${Date.now()}\n${owner}\n`, { flag: "wx" });
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }
}

function release() {
  try {
    const existing = readLock();
    if (existing && existing.pid === process.pid) {
      fs.unlinkSync(LOCK_PATH);
    }
  } catch {
    /* ignore */
  }
}

/**
 * Cross-process lock so only one bot solves CAPTCHA / submits login at a time.
 * Prevents 8 bots thrashing one Chrome + 2captcha together.
 */
export async function withLoginLock<T>(
  owner: string,
  fn: () => Promise<T>,
  log?: (step: string, detail?: string) => void
): Promise<T> {
  // Watchdog already starts bots one-at-a-time — skip file lock (was doubling wait time)
  if ((process.env.SKIP_LOGIN_LOCK ?? "1").trim() === "1") {
    return await fn();
  }
  const started = Date.now();
  let lastLog = 0;
  while (!tryAcquire(owner)) {
    if (Date.now() - started > 240_000) {
      throw new Error(`Login lock timeout — another bot held CAPTCHA login too long (${owner})`);
    }
    // Log at most once every 15s (was spamming every 1.5s)
    if (Date.now() - lastLog > 15_000) {
      log?.("login", "waiting for login lock (another bot is logging in)...");
      lastLog = Date.now();
    }
    await sleep(1500);
  }

  // Heartbeat so waiting bots don't treat a long CAPTCHA solve as a stale lock
  const beat = setInterval(() => {
    try {
      if (readLock()?.pid === process.pid) {
        fs.writeFileSync(LOCK_PATH, `${process.pid}\n${Date.now()}\n${owner}\n`);
      }
    } catch {
      /* ignore */
    }
  }, 20_000);

  log?.("login", `acquired login lock (${owner})`);
  try {
    return await fn();
  } finally {
    clearInterval(beat);
    release();
    log?.("login", `released login lock (${owner})`);
  }
}
