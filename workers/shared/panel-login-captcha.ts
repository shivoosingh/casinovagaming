import type { Locator, Page } from "playwright";
import {
  captchaMaxRetries,
  isAutoCaptchaEnabled,
  solveCaptchaImage,
} from "./captcha-solver.js";
import { clearExpiryAndNeedRelogin } from "./dismiss-session-dialog.js";
import { withLoginLock } from "./login-mutex.js";

export { isAutoCaptchaEnabled, isCaptchaSolverConfigured } from "./captcha-solver.js";

export type PanelLoginLog = (step: string, detail?: string) => void;

export interface PanelLoginOptions {
  log: PanelLoginLog;
  isLoginPage: (page: Page) => Promise<boolean>;
  /** When false, only auto-solve is attempted (no waiting for human). */
  allowManual?: boolean;
  manualTimeoutMs?: number;
  loginButtonPatterns?: RegExp[];
  /** Re-fill username/password before each CAPTCHA attempt (critical after failed login). */
  refillCredentials?: () => Promise<void>;
  /** Shown in login-lock logs (defaults to process cwd folder name). */
  lockOwner?: string;
}

/** Re-fill agent username/password on the login form (used between CAPTCHA retries). */
export function makeCredentialRefill(
  page: Page,
  usernameEnv: string,
  passwordEnv: string
): () => Promise<void> {
  return async () => {
    const username =
      process.env[usernameEnv]?.trim() || process.env.PANEL_USERNAME?.trim() || "";
    const password =
      process.env[passwordEnv]?.trim() || process.env.PANEL_PASSWORD?.trim() || "";

    if (username) {
      const layuiUser = page
        .locator(
          'input[name="username"], input[name="userName"], input[name="account"], #username, .layadmin-user-login-username input, input[placeholder*="user" i], input[placeholder*="account" i]'
        )
        .first();
      if ((await layuiUser.count()) > 0 && (await layuiUser.isVisible().catch(() => false))) {
        await layuiUser.fill(username).catch(() => {});
      } else {
        // Prefer first non-captcha text input
        const inputs = page.locator(
          'input:not([type="password"]):not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([name*="code" i]):not([name*="captcha" i]):not([name*="vercode" i]):not([placeholder*="code" i]):not([placeholder*="verify" i])'
        );
        if ((await inputs.count()) > 0) {
          await inputs.first().fill(username).catch(() => {});
        }
      }
    }
    if (password) {
      const pass = page
        .locator(
          'input[name="password"], #password, .layadmin-user-login-password input, input[type="password"]'
        )
        .first();
      await pass.fill(password).catch(() => {});
    }
  };
}

const DEFAULT_LOGIN_PATTERNS = [/sign in|log in|login|登[录陆]|^\s*ok\s*$|confirm|submit/i];

async function findCaptchaInput(page: Page): Promise<Locator | null> {
  const explicit = page
    .locator(
      [
        'input[name="vercode"]',
        'input[name="captcha"]',
        'input[name="code"]',
        'input[placeholder*="code" i]',
        'input[placeholder*="verify" i]',
        'input[placeholder*="captcha" i]',
        'input[placeholder*="vc" i]',
        'input[name*="captcha" i]',
        'input[name*="verify" i]',
        'input[id*="captcha" i]',
        'input[id*="verify" i]',
        ".layadmin-user-login-code input",
      ].join(", ")
    )
    .first();
  if ((await explicit.count()) > 0 && (await explicit.isVisible().catch(() => false))) {
    return explicit;
  }

  const textInputs = page.locator(
    'input:not([type="password"]):not([type="hidden"]):not([type="checkbox"]):not([type="radio"])'
  );
  const count = await textInputs.count();
  if (count >= 2) {
    const last = textInputs.last();
    if (await last.isVisible().catch(() => false)) return last;
  }
  return null;
}

async function findCaptchaImage(page: Page): Promise<Locator | null> {
  const srcPatterns = [
    ".layadmin-user-login-codeimg img",
    ".layui-codeimg img",
    'img[src*="captcha" i]',
    'img[src*="verify" i]',
    'img[src*="vcode" i]',
    'img[src*="validate" i]',
    'img[src*="code" i]',
    'img[src*="rand" i]',
    'img[src*="auth" i]',
    'img[src*="getCode" i]',
    'img[src*="checkcode" i]',
    "#verifyImg",
    "#captchaImg",
    "#captcha",
    ".captcha img",
    ".verify-code img",
    ".login-captcha img",
    ".code img",
  ];

  for (const sel of srcPatterns) {
    const loc = page.locator(sel).first();
    if ((await loc.count()) === 0) continue;
    if (!(await loc.isVisible().catch(() => false))) continue;
    const box = await loc.boundingBox().catch(() => null);
    if (box && box.width >= 40 && box.height >= 15 && box.height <= 120) return loc;
  }

  // Image beside the verify/code input (Juwa etc. often have no "captcha" in the URL)
  const verifyInput = await findCaptchaInput(page);
  if (verifyInput) {
    const nearImg = verifyInput
      .locator(
        "xpath=ancestor::form[1]//img | ancestor::div[2]//img | following::img[1] | preceding::img[1]"
      )
      .first();
    if ((await nearImg.count()) > 0 && (await nearImg.isVisible().catch(() => false))) {
      const box = await nearImg.boundingBox().catch(() => null);
      const src = ((await nearImg.getAttribute("src").catch(() => "")) || "").toLowerCase();
      if (
        box &&
        box.width >= 40 &&
        box.width <= 280 &&
        box.height >= 15 &&
        box.height <= 100 &&
        !/logo|brand|banner|avatar|icon/.test(src)
      ) {
        return nearImg;
      }
    }
  }

  const imgs = page.locator("img");
  const count = await imgs.count();
  for (let i = 0; i < count; i++) {
    const img = imgs.nth(i);
    if (!(await img.isVisible().catch(() => false))) continue;
    const src = ((await img.getAttribute("src").catch(() => "")) || "").toLowerCase();
    if (/logo|brand|banner|avatar|icon|juwa/.test(src)) continue;
    const box = await img.boundingBox().catch(() => null);
    if (!box) continue;
    if (box.width >= 60 && box.width <= 220 && box.height >= 20 && box.height <= 90) {
      return img;
    }
  }

  return null;
}

async function clickLoginButton(page: Page, patterns: RegExp[], log?: PanelLoginLog): Promise<boolean> {
  const tryClick = async (loc: Locator, label: string): Promise<boolean> => {
    if ((await loc.count()) === 0) return false;
    if (!(await loc.isVisible().catch(() => false))) return false;
    try {
      await loc.scrollIntoViewIfNeeded().catch(() => {});
      await loc.click({ timeout: 8000, force: true });
      log?.("login", `clicked Login via ${label}`);
      return true;
    } catch {
      try {
        await loc.evaluate((el) => {
          const node = el as HTMLElement;
          node.focus();
          node.click();
          // layui / some panels bind submit on this attribute
          if (node.getAttribute("lay-submit") != null) {
            node.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
          }
        });
        log?.("login", `clicked Login via ${label} (DOM)`);
        return true;
      } catch {
        return false;
      }
    }
  };

  for (const pattern of patterns) {
    if (await tryClick(page.getByRole("button", { name: pattern }).first(), `role:${pattern}`)) {
      return true;
    }
    if (await tryClick(page.getByRole("link", { name: pattern }).first(), `link:${pattern}`)) {
      return true;
    }
    if (
      await tryClick(
        page.locator("button, a, input[type='submit'], .layui-btn, .el-button").filter({ hasText: pattern }).first(),
        `text:${pattern}`
      )
    ) {
      return true;
    }
  }

  const fallbacks: Array<[Locator, string]> = [
    [page.locator("button[lay-submit], [lay-submit]").first(), "lay-submit"],
    [
      page.locator(".layui-btn-fluid, .layui-btn-normal, .layui-btn").filter({ hasText: /login|sign in|log in|登[录陆]/i }).first(),
      "layui-btn",
    ],
    [
      page.locator(".el-button--primary, button.el-button").filter({ hasText: /login|sign in|log in|登[录陆]/i }).first(),
      "el-button",
    ],
    [page.locator(".el-button--primary").first(), "el-button--primary"],
    [page.locator('button[type="submit"], input[type="submit"]').first(), "type=submit"],
    [page.locator("form button, .login-form button, .login button").first(), "form-button"],
  ];
  for (const [loc, label] of fallbacks) {
    if (await tryClick(loc, label)) return true;
  }
  return false;
}

/** After CAPTCHA is typed: click Login once. Enter only if click fails (never both — double submit kills CAPTCHA). */
async function submitLoginForm(
  page: Page,
  captchaInput: Locator,
  patterns: RegExp[],
  log: PanelLoginLog
): Promise<boolean> {
  await captchaInput.blur().catch(() => {});
  await page.waitForTimeout(200);

  const clicked = await clickLoginButton(page, patterns, log);
  if (clicked) return true;

  log("login", "Login button not found — trying Enter once");
  await captchaInput.click({ timeout: 3000 }).catch(() => {});
  await captchaInput.press("Enter").catch(() => {});
  await page.waitForTimeout(500);

  if (!(await page.locator('input[type="password"]').first().isVisible().catch(() => false))) {
    return true;
  }

  await page.keyboard.press("Enter").catch(() => {});
  return true;
}

/** Undo freeze (data: URL + pointer-events:none) so the next attempt gets a real image. */
async function unfreezeCaptchaDisplay(captchaImg: Locator): Promise<void> {
  await captchaImg
    .evaluate((el) => {
      const img = el as HTMLImageElement;
      img.style.pointerEvents = "";
      const src = img.getAttribute("src") || "";
      if (src.startsWith("data:")) {
        // Force a brand-new server captcha — frozen data: URLs must not be reused.
        const base = (img.getAttribute("data-original-src") || "").trim();
        if (base && !base.startsWith("data:")) {
          const joiner = base.includes("?") ? "&" : "?";
          img.src = `${base}${joiner}_=${Date.now()}`;
        } else {
          img.removeAttribute("src");
          img.click?.();
        }
      }
    })
    .catch(() => {});
}

async function refreshCaptchaImage(page: Page, log: PanelLoginLog): Promise<void> {
  const img = await findCaptchaImage(page);
  if (!img) return;

  await unfreezeCaptchaDisplay(img);

  // Prefer cache-busting the captcha URL over clicking a frozen/dead image.
  const refreshed = await img
    .evaluate((el) => {
      const image = el as HTMLImageElement;
      let src = image.getAttribute("data-original-src") || image.getAttribute("src") || "";
      if (!src || src.startsWith("data:")) return false;
      src = src.replace(/([?&])_=\d+/g, "").replace(/\?&/, "?").replace(/[?&]$/, "");
      const joiner = src.includes("?") ? "&" : "?";
      image.style.pointerEvents = "";
      image.src = `${src}${joiner}_=${Date.now()}`;
      return true;
    })
    .catch(() => false);

  if (!refreshed) {
    await img.click({ timeout: 3000, force: true }).catch(() => {});
  }
  await page.waitForTimeout(1000);
  log("login", "refreshed CAPTCHA image");
}

/** Many panels ignore fill() — type with real keypresses, verify, and retry until the field holds the code. */
async function typeCaptchaSolution(
  captchaInput: Locator,
  solution: string,
  log: PanelLoginLog
): Promise<boolean> {
  const readBack = async () =>
    ((await captchaInput.inputValue().catch(() => "")) || "").trim();

  const strategies: Array<() => Promise<void>> = [
    async () => {
      await captchaInput.click({ timeout: 5000 }).catch(() => {});
      await captchaInput.fill("").catch(() => {});
      await captchaInput.press("Control+A").catch(() => {});
      await captchaInput.press("Backspace").catch(() => {});
      await captchaInput.pressSequentially(solution, { delay: 15 });
    },
    async () => {
      await captchaInput.fill(solution);
    },
    async () => {
      // Focus can be stolen by dialogs/re-renders — set value directly in the DOM
      await captchaInput.evaluate((el, value) => {
        const input = el as HTMLInputElement;
        input.focus();
        input.value = value;
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
      }, solution);
    },
  ];

  for (const strategy of strategies) {
    await strategy().catch(() => {});
    const typed = await readBack();
    if (typed === solution) {
      log("login", `typed CAPTCHA into field: "${typed}"`);
      return true;
    }
  }

  const finalValue = await readBack();
  log(
    "login",
    `CAPTCHA field shows "${finalValue}" (wanted "${solution}") — field not accepting input`
  );
  return finalValue === solution;
}

/** Game Vault / Element Plus CAPTCHA imgs auto-refresh — element.screenshot() times out on "not stable". */
async function captureCaptchaPng(page: Page, captchaImg: Locator): Promise<Buffer | null> {
  const box = await captchaImg.boundingBox().catch(() => null);
  if (box && box.width >= 40 && box.height >= 15) {
    const clip = await page
      .screenshot({ clip: box, type: "png", timeout: 8000 })
      .catch(() => null);
    if (clip) return Buffer.from(clip);
  }

  const src = await captchaImg.getAttribute("src").catch(() => null);
  if (src && !src.startsWith("data:")) {
    try {
      const url = src.startsWith("http") ? src : new URL(src, page.url()).href;
      const res = await page.request.get(url);
      if (res.ok()) {
        const body = await res.body();
        if (body.length > 100) return Buffer.from(body);
      }
    } catch {
      /* fall through */
    }
  }

  const el = await captchaImg.screenshot({ type: "png", timeout: 8000 }).catch(() => null);
  return el ? Buffer.from(el) : null;
}

/** Stop auto-refreshing CAPTCHA while 2Captcha/OCR runs (Game Vault refreshes every ~1s). */
async function freezeCaptchaDisplay(captchaImg: Locator, png: Buffer): Promise<void> {
  const dataUrl = `data:image/png;base64,${png.toString("base64")}`;
  await captchaImg
    .evaluate((el, frozen) => {
      const img = el as HTMLImageElement;
      const current = img.getAttribute("src") || "";
      if (current && !current.startsWith("data:")) {
        img.setAttribute("data-original-src", current);
      }
      img.src = frozen;
      img.style.pointerEvents = "none";
    }, dataUrl)
    .catch(() => {});
}

/** Ensure username/password are still present right before Login (some panels clear them). */
async function ensureCredentialsStillFilled(
  page: Page,
  refillCredentials: (() => Promise<void>) | undefined,
  log: PanelLoginLog
): Promise<void> {
  const user = page
    .locator('input:not([type="password"]):not([type="hidden"]):not([type="checkbox"]):not([type="radio"])')
    .first();
  const pass = page.locator('input[type="password"]').first();
  const userVal = ((await user.inputValue().catch(() => "")) || "").trim();
  const passVal = ((await pass.inputValue().catch(() => "")) || "").trim();
  if (!userVal || !passVal) {
    log("login", `credentials empty before submit (user=${userVal.length}chars pass=${passVal.length}chars) — re-filling`);
    if (refillCredentials) await refillCredentials().catch(() => {});
  } else {
    log("login", `credentials present (user=${userVal.length}chars pass=${passVal.length}chars)`);
  }
}

async function attemptAutoCaptchaLogin(page: Page, options: PanelLoginOptions): Promise<boolean> {
  const { log, isLoginPage } = options;
  const patterns = options.loginButtonPatterns ?? DEFAULT_LOGIN_PATTERNS;

  await page.bringToFront().catch(() => {});

  if (options.refillCredentials) {
    await options.refillCredentials().catch(() => {});
  }

  const captchaImg = await findCaptchaImage(page);
  if (!captchaImg) {
    log("login", "auto captcha — no CAPTCHA image found on page");
    return false;
  }

  const captchaInput = await findCaptchaInput(page);
  if (!captchaInput) {
    log("login", "auto captcha — no CAPTCHA input found on page");
    return false;
  }

  const refreshPattern = /\/(api\/agent\/captcha|captcha|vcode|verifycode)/i;
  let blockCaptchaRefresh = false;
  await page.route(refreshPattern, async (route) => {
    if (blockCaptchaRefresh && route.request().resourceType() === "image") {
      await route.abort();
      return;
    }
    await route.continue();
  });

  try {
    const png = await captureCaptchaPng(page, captchaImg);
    if (!png) {
      log("login", "auto captcha — could not capture CAPTCHA image");
      return false;
    }

    blockCaptchaRefresh = true;
    await freezeCaptchaDisplay(captchaImg, png);

    let solution: string;
    try {
      const result = await solveCaptchaImage(png);
      solution = result.text;
      log("login", `CAPTCHA read (${result.method}, ${solution.length} chars): ${solution}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log("login", `CAPTCHA read failed: ${msg}`);
      return false;
    }

    // Panel codes are digits — reject logo OCR junk like "sss" / "juwa"
    const cleaned = solution.replace(/\s+/g, "").trim();
    const digits = cleaned.replace(/\D/g, "");
    if (digits.length < 4 || digits.length > 8 || digits !== cleaned) {
      log("login", `CAPTCHA looks invalid ("${cleaned}") — refreshing`);
      return false;
    }

    const typedOk = await typeCaptchaSolution(captchaInput, cleaned, log);
    if (!typedOk) {
      log("login", "could not get CAPTCHA code into the field — retrying attempt");
      return false;
    }
    await ensureCredentialsStillFilled(page, options.refillCredentials, log);

    await submitLoginForm(page, captchaInput, patterns, log);

    // Short wait only
    await page.waitForTimeout(1200);
    if (!(await isLoginPage(page))) {
      return true;
    }

    const reason = await readLoginFailureReason(page);
    if (reason === "bad_password") {
      log(
        "login",
        "panel says invalid username/password — CAPTCHA was accepted; check agent credentials"
      );
    } else if (reason === "bad_captcha") {
      log("login", "panel says wrong CAPTCHA/code — will refresh and retry");
    } else {
      log("login", "still on login page after auto CAPTCHA — wrong code or bad credentials");
    }
    return false;
  } finally {
    blockCaptchaRefresh = false;
    await unfreezeCaptchaDisplay(captchaImg).catch(() => {});
    await page.unroute(refreshPattern).catch(() => {});
  }
}

/** Read toast/alert after failed login to tell password vs CAPTCHA apart. */
async function readLoginFailureReason(
  page: Page
): Promise<"bad_password" | "bad_captcha" | "unknown"> {
  const selectors = [
    ".el-message",
    ".el-message__content",
    ".el-form-item__error",
    ".layui-layer-content",
    ".layui-layer-dialog",
    ".ant-message-notice-content",
    ".toast",
    ".login-error",
    ".error-message",
  ];
  const chunks: string[] = [];
  for (const sel of selectors) {
    const loc = page.locator(sel);
    const n = Math.min(await loc.count().catch(() => 0), 4);
    for (let i = 0; i < n; i++) {
      const t = ((await loc.nth(i).innerText().catch(() => "")) || "").trim();
      if (t && t.length < 200) chunks.push(t);
    }
  }
  // Do NOT scan full body — hangs on heavy admin pages and false-matches "code" everywhere
  const joined = chunks.join(" ").toLowerCase();
  if (!joined) return "unknown";

  const captchaFail =
    /captcha|verification code|verify code|invalid code|wrong code|code error|验证码/.test(
      joined
    );
  const passFail =
    /incorrect username|incorrect password|invalid username|invalid password|wrong username|wrong password|user name or password|username or password|account or password|bad credentials|login failed|密码错误/.test(
      joined
    );

  if (passFail && !captchaFail) return "bad_password";
  if (captchaFail && !passFail) return "bad_captcha";
  if (passFail) return "bad_password";
  if (captchaFail) return "bad_captcha";
  return "unknown";
}

async function dismissLoginToasts(page: Page): Promise<void> {
  await page.keyboard.press("Escape").catch(() => {});
  await page.locator(".el-message__closeBtn, .layui-layer-close, .el-notification__closeBtn").first().click({ timeout: 500 }).catch(() => {});
}

async function waitForFreshCaptcha(page: Page, log: PanelLoginLog): Promise<boolean> {
  await dismissLoginToasts(page);
  await refreshCaptchaImage(page, log);
  for (let i = 0; i < 4; i++) {
    const img = await findCaptchaImage(page);
    if (img) {
      const box = await img.boundingBox().catch(() => null);
      if (box && box.width >= 40) return true;
    }
    await page.waitForTimeout(200);
  }
  log("login", "CAPTCHA image not visible yet after refresh");
  return false;
}

async function waitForManualLoginOnly(page: Page, options: PanelLoginOptions): Promise<void> {
  const { log, isLoginPage } = options;
  const timeoutMs = Number(
    options.manualTimeoutMs ?? process.env.CAPTCHA_MANUAL_TIMEOUT_MS ?? 2500
  );
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error("Login failed — auto CAPTCHA did not succeed (manual wait disabled)");
  }
  log("login", "CAPTCHA on page — log in manually in Chrome (enter code + click Login)");
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!(await isLoginPage(page))) return;
    await page.waitForTimeout(400);
  }
  throw new Error("Login timeout — enter CAPTCHA and click Login in the Chrome window");
}

/**
 * Bot reads the CAPTCHA image (2captcha / OCR), submits login, then falls back to manual wait.
 * Uses a cross-process login lock so only one bot CAPTCHA-logins at a time.
 */
export async function waitForPanelLogin(page: Page, options: PanelLoginOptions): Promise<void> {
  const { log, isLoginPage } = options;
  const allowManual = options.allowManual !== false;
  const maxRetries = captchaMaxRetries();
  const manualTimeoutMs = Number(
    options.manualTimeoutMs ?? process.env.CAPTCHA_MANUAL_TIMEOUT_MS ?? 2500
  );
  const manualEnabled = allowManual && Number.isFinite(manualTimeoutMs) && manualTimeoutMs > 0;

  // Background tabs often don't paint CAPTCHA — always focus first
  await page.bringToFront().catch(() => {});
  await page.waitForTimeout(150);

  // Session expiry shows "Login timeout" + Ok while still on dashboard URL
  const needRelogin = await clearExpiryAndNeedRelogin(page, log);
  if (needRelogin) {
    log("login", "session expired — Ok clicked, starting CAPTCHA re-login");
  }

  if (!needRelogin && !(await isLoginPage(page))) {
    log("login", "already logged in — skip CAPTCHA");
    return;
  }

  if (isAutoCaptchaEnabled()) {
    const owner =
      options.lockOwner ||
      process.cwd().split(/[/\\]/).filter(Boolean).pop() ||
      `pid-${process.pid}`;

    const ok = await withLoginLock(owner, async () => {
      // Re-check after waiting for lock — another bot may have left us alone; tab may have changed
      if (!(await isLoginPage(page))) {
        log("login", "already logged in after waiting for lock");
        return true;
      }
      if (options.refillCredentials) {
        await options.refillCredentials().catch(() => {});
      }

      let noImageStreak = 0;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        log("login", `reading CAPTCHA attempt ${attempt}/${maxRetries}`);
        const success = await attemptAutoCaptchaLogin(page, options);
        if (success) {
          log("login", "success (bot read CAPTCHA)");
          return true;
        }

        // Fail fast if captcha image vanished — don't hold the global lock forever
        const img = await findCaptchaImage(page);
        if (!img) {
          noImageStreak++;
          if (noImageStreak >= 2) {
            log("login", "CAPTCHA image missing twice — releasing lock");
            break;
          }
        } else {
          noImageStreak = 0;
        }

        if (attempt < maxRetries) {
          await waitForFreshCaptcha(page, log);
          if (options.refillCredentials) {
            await options.refillCredentials().catch(() => {});
          }
        }
      }
      return false;
    }, log);

    if (ok) return;
    log("login", "bot could not finish auto-login — falling back to manual if allowed");
  }

  if (manualEnabled) {
    await waitForManualLoginOnly(page, { ...options, manualTimeoutMs });
    return;
  }

  if (!(await isLoginPage(page))) return;

  throw new Error(
    "Login failed — bot could not read CAPTCHA. Use CDP mode and log in manually in Chrome."
  );
}
