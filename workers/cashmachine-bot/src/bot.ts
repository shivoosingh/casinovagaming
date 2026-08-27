import type { SupabaseClient } from "@supabase/supabase-js";
import type { GameLoadJob, BotResult } from "./types.js";
import { planCreateAccount, variantFromPlan } from "../../shared/numbered-credentials.js";
import { resolveDepositRedeemForJob } from "../../shared/deposit-redeem-guard.js";
import { openBrowserSession, vpnHint } from "./browser.js";
import {
  loginToPanel,
  createAccount,
  rechargeAccount,
  redeemAccount,
  readBalance,
} from "./panel.js";
import { isLoginPage, log, screenshot } from "./panel-utils.js";
import { ensurePanelSession } from "../../shared/ensure-panel-session.js";
import { getCashMachineApiClient } from "./api-client.js";

/** Check if API execution mode is preferred */
function isApiMode(): boolean {
  return process.env.CASHMACHINE_USE_API !== "false";
}

export async function ensurePanelLoggedIn(): Promise<void> {
  if (isApiMode()) {
    const api = getCashMachineApiClient();
    await api.login();
    log("api-login", "authenticated via direct REST API");
    return;
  }
  await ensurePanelSession(openBrowserSession, "CASHMACHINE_CDP_URL", loginToPanel, isLoginPage);
}

export async function runJob(job: GameLoadJob, supabase: SupabaseClient): Promise<BotResult> {
  if (isApiMode()) {
    const api = getCashMachineApiClient();

    if (job.load_type === "create_account" || job.load_type === "new_account") {
      const plan = planCreateAccount(job);
      log(
        "create-user-api",
        `${plan.stem} from #${plan.startNum} (requester: ${job.requester_name ?? job.requester_email ?? job.user_id})`
      );
      const password = plan.preferredPassword || "123456";
      const username = `${plan.stem}${plan.startNum}`;

      const res = await api.addPlayer(username, password);
      return {
        username: res.data.account,
        password: res.data.password,
      };
    }

    if (job.load_type === "load" || job.load_type === "reload") {
      const username = job.game_username?.trim();
      if (!username) throw new Error("Load requires game username");
      await api.rechargePlayer(username, Number(job.amount), `job-${job.id}`);
      return { username };
    }

    if (job.load_type === "redeem") {
      const username = job.game_username?.trim();
      if (!username) throw new Error("Redeem requires game username");
      const scoreRes = await api.getPlayerScore(username);
      const balance = scoreRes.data.balance;
      const amount = await resolveDepositRedeemForJob(supabase, job, balance);
      await api.withdrawPlayer(username, amount, `job-${job.id}`);
      return { username, redeemedAmount: amount };
    }

    if (job.load_type === "check_balance") {
      const username = job.game_username?.trim();
      if (!username) throw new Error("Check balance requires game username");
      const scoreRes = await api.getPlayerScore(username);
      return { username, balance: scoreRes.data.balance };
    }

    throw new Error(`Unknown load type: ${job.load_type}`);
  }

  // Fallback Playwright browser execution
  const session = await openBrowserSession();
  const { page, close } = session;

  try {
    await loginToPanel(page);

    if (job.load_type === "create_account" || job.load_type === "new_account") {
      const plan = planCreateAccount(job);
      log(
        "create-user",
        `${plan.stem} from #${plan.startNum} (requester: ${job.requester_name ?? job.requester_email ?? job.user_id})`
      );
      const creds = await createAccount(
        page,
        plan.stem,
        plan.preferredPassword ?? "",
        variantFromPlan(plan),
        { forceNewAccount: plan.forceNewAccount }
      );
      return creds;
    }

    if (job.load_type === "load" || job.load_type === "reload") {
      const username = job.game_username?.trim();
      if (!username) throw new Error("Load requires game username");
      await rechargeAccount(page, username, Number(job.amount));
      return { username };
    }

    if (job.load_type === "redeem") {
      const username = job.game_username?.trim();
      if (!username) throw new Error("Redeem requires game username");
      const balance = await readBalance(page, username);
      const amount = await resolveDepositRedeemForJob(supabase, job, balance);
      const redeemedAmount = await redeemAccount(page, username, amount, false);
      return { username, redeemedAmount };
    }

    if (job.load_type === "check_balance") {
      const username = job.game_username?.trim();
      if (!username) throw new Error("Check balance requires game username");
      const balance = await readBalance(page, username);
      return { username, balance };
    }

    throw new Error(`Unknown load type: ${job.load_type}`);
  } catch (err) {
    await screenshot(page, "error");
    throw new Error(vpnHint(err));
  } finally {
    if (!process.env.CASHMACHINE_CDP_URL) {
      await close();
    }
  }
}
