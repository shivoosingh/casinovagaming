/**
 * 24/7 Session Keeper
 * - On startup: full login (CAPTCHA if needed)
 * - If not logged in: after a short boot grace, priority retries until success
 * - Healthy bots: long interval checks only
 */

function env(name: string): string | undefined {
  return process.env[name]?.trim() || undefined;
}

const activeBotInstances = new Set<string>();

export function isSessionKeeperEnabled(): boolean {
  const raw = (env("SESSION_KEEPER") ?? "true").toLowerCase();
  return raw !== "false" && raw !== "0" && raw !== "off";
}

export function sessionCheckIntervalMs(): number {
  const n = Number(env("SESSION_CHECK_MS") ?? 300_000);
  return Number.isFinite(n) && n >= 60_000 ? Math.floor(n) : 300_000;
}

/** Fast retry while a bot is still not logged in. */
export function sessionRetryIntervalMs(): number {
  const n = Number(env("SESSION_RETRY_MS") ?? 45_000);
  return Number.isFinite(n) && n >= 15_000 ? Math.floor(n) : 45_000;
}

/** Wait after a failed startup before priority retries (lets watchdog finish pass + repair). */
export function sessionBootGraceMs(): number {
  const n = Number(env("SESSION_BOOT_GRACE_MS") ?? 90_000);
  return Number.isFinite(n) && n >= 30_000 ? Math.floor(n) : 90_000;
}

export async function startPanelSessionKeeper(
  botLabel: string,
  ensureLoggedIn: () => Promise<void>
): Promise<void> {
  if (!isSessionKeeperEnabled()) {
    console.log(`[${botLabel}] Session keeper disabled (SESSION_KEEPER=false)`);
    return;
  }

  if (activeBotInstances.has(botLabel)) {
    console.log(`[${botLabel}] Session keeper already running — skip duplicate`);
    return;
  }
  activeBotInstances.add(botLabel);

  const healthyMs = sessionCheckIntervalMs();
  const retryMs = sessionRetryIntervalMs();
  const graceMs = sessionBootGraceMs();
  let checking = false;
  let isLoggedIn = false;
  let useBootGrace = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const check = async (reason: "startup" | "interval" | "priority") => {
    if (checking) {
      console.log(`[${botLabel}] Session check skipped (already in progress)`);
      return;
    }
    checking = true;
    try {
      if (reason === "startup") {
        console.log(`[${botLabel}] Session startup — login / CAPTCHA if needed...`);
      } else if (reason === "priority") {
        console.log(`[${botLabel}] Priority re-login (not logged in yet)...`);
      }
      await ensureLoggedIn();
      isLoggedIn = true;
      useBootGrace = false;
      if (reason === "startup") {
        console.log(`[${botLabel}] Session ready`);
      } else {
        console.log(`[${botLabel}] Auto-relogin OK`);
      }
    } catch (err) {
      isLoggedIn = false;
      const msg = err instanceof Error ? err.message : String(err);
      if (reason === "startup") {
        useBootGrace = true;
        console.warn(`[${botLabel}] Session issue (startup): ${msg}`);
        console.log(`[${botLabel}] Session NOT ready — watchdog will prioritize repair`);
      } else {
        console.warn(`[${botLabel}] Session issue (${reason}): ${msg}`);
        console.log(`[${botLabel}] Session NOT ready — priority retry scheduled`);
      }
    } finally {
      checking = false;
    }
  };

  const scheduleNext = () => {
    if (timer) clearTimeout(timer);
    let delay: number;
    if (isLoggedIn) {
      delay = healthyMs;
    } else if (useBootGrace) {
      delay = graceMs;
      useBootGrace = false;
    } else {
      delay = retryMs;
    }
    timer = setTimeout(() => {
      void (async () => {
        await check(isLoggedIn ? "interval" : "priority");
        scheduleNext();
      })();
    }, delay);
  };

  await check("startup");

  if (isLoggedIn) {
    console.log(
      `[${botLabel}] Session keeper on — health check every ${Math.round(healthyMs / 1000)}s`
    );
  } else {
    console.log(
      `[${botLabel}] Session keeper on — PRIORITY: grace ${Math.round(graceMs / 1000)}s, then every ${Math.round(retryMs / 1000)}s until logged in`
    );
  }

  scheduleNext();
}
