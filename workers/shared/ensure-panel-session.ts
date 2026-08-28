import type { Page } from "playwright";
import { clearExpiryAndNeedRelogin } from "./dismiss-session-dialog.js";

type OpenSession = () => Promise<{ page: Page; close: () => Promise<void> }>;

/**
 * Open browser, dismiss timeout dialogs, log in (CAPTCHA) only if needed.
 */
export async function ensurePanelSession(
  openBrowserSession: OpenSession,
  cdpEnvVar: string,
  loginToPanel: (page: Page) => Promise<void>,
  isLoginPage?: (page: Page) => Promise<boolean>
): Promise<void> {
  const session = await openBrowserSession();
  try {
    const page = session.page;
    await page.bringToFront().catch(() => {});

    const expired = await clearExpiryAndNeedRelogin(page, (step, detail) => {
      console.log(`[session] ${step}${detail ? `: ${detail}` : ""}`);
    });

    if (expired) {
      await loginToPanel(page);
      return;
    }

    if (isLoginPage && !(await isLoginPage(page))) {
      return;
    }
    await loginToPanel(page);
  } finally {
    if (!process.env[cdpEnvVar]?.trim()) {
      await session.close();
    }
  }
}
