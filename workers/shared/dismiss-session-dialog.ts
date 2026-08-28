import type { Page } from "playwright";

export type SessionLog = (step: string, detail?: string) => void;

const TIMEOUT_DIALOG_RE =
  /login timeout|login message timed out|timed out.*log in|please log in again|session (has )?expir|re-?login|登录超时|重新登录|登录失效/i;

/**
 * Panels often show "Login timeout" / "please log in again" with an Ok button
 * while still on the dashboard URL — so isLoginPage() is false and bots skip re-login.
 * Click Ok so the page can return to /login, then CAPTCHA login can run.
 */
export async function dismissSessionExpiryDialog(
  page: Page,
  log?: SessionLog
): Promise<boolean> {
  await page.bringToFront().catch(() => {});

  const dialog = page
    .locator(
      [
        ".el-message-box",
        ".el-message-box__wrapper",
        ".el-dialog",
        ".el-overlay-dialog",
        ".layui-layer-dialog",
        ".layui-layer",
        "[role='dialog']",
      ].join(", ")
    )
    .filter({ hasText: TIMEOUT_DIALOG_RE })
    .first();

  if (!(await dialog.isVisible().catch(() => false))) {
    // Sometimes only the message text is visible without a clean wrapper
    const byText = page.getByText(TIMEOUT_DIALOG_RE).first();
    if (!(await byText.isVisible().catch(() => false))) return false;
  }

  log?.("session", "Login timeout dialog found — clicking Ok");

  const scopes = [
    dialog,
    page.locator(".el-message-box"),
    page.locator(".layui-layer-dialog, .layui-layer"),
    page,
  ];

  for (const scope of scopes) {
    const okBtn = scope
      .getByRole("button", { name: /^\s*ok\s*$/i })
      .or(scope.locator("button, .el-button, .layui-layer-btn0, a").filter({ hasText: /^\s*ok\s*$/i }))
      .first();
    if ((await okBtn.count()) > 0 && (await okBtn.isVisible().catch(() => false))) {
      await okBtn.click({ force: true, timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(600);
      return true;
    }
  }

  // Last resort: Enter / click primary blue button in message box
  await page.keyboard.press("Enter").catch(() => {});
  await page
    .locator(".el-message-box__btns .el-button--primary, .layui-layer-btn0")
    .first()
    .click({ force: true })
    .catch(() => {});
  await page.waitForTimeout(600);
  return true;
}

/** True if a session-expiry dialog is currently blocking the panel. */
export async function hasSessionExpiryDialog(page: Page): Promise<boolean> {
  const dialog = page
    .locator(".el-message-box, .el-dialog, .layui-layer-dialog, .layui-layer, [role='dialog']")
    .filter({ hasText: TIMEOUT_DIALOG_RE })
    .first();
  if (await dialog.isVisible().catch(() => false)) return true;
  return page.getByText(TIMEOUT_DIALOG_RE).first().isVisible().catch(() => false);
}

/**
 * Click Ok on timeout dialogs and wait for /login (or password field).
 * Returns true when a re-login (CAPTCHA) is required.
 */
export async function clearExpiryAndNeedRelogin(
  page: Page,
  log?: SessionLog
): Promise<boolean> {
  const had = await dismissSessionExpiryDialog(page, log);
  if (!had && !(await hasSessionExpiryDialog(page))) return false;

  if (!had) await dismissSessionExpiryDialog(page, log);

  await Promise.race([
    page.waitForURL(/\/login/i, { timeout: 8000 }),
    page.locator('input[type="password"]').first().waitFor({ state: "visible", timeout: 8000 }),
  ]).catch(() => {});
  await page.waitForTimeout(300);
  return true;
}
