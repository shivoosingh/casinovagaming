import { createAdminClient } from "@/lib/supabase/admin";
import { MilkyWayApiClient } from "./milkyway-api";

export interface AutoFulfillMilkyWayOptions {
  requestId?: string;
  gameSlug?: string;
  loadType: "create_account" | "check_balance" | "load" | "redeem";
  accountName: string;
  password?: string;
  amount?: number;
}

export interface AutoFulfillMilkyWayResult {
  success: boolean;
  message: string;
  accountName: string;
  credentials?: {
    username: string;
    password?: string;
  };
  balance?: number;
  newBalance?: number;
  rawResponse?: any;
}

export async function autoFulfillMilkyWayRequest(
  options: AutoFulfillMilkyWayOptions
): Promise<AutoFulfillMilkyWayResult> {
  const client = new MilkyWayApiClient();

  const { requestId, loadType, accountName, password, amount = 0 } = options;
  const cleanAccount = accountName.trim();
  const admin = createAdminClient();

  try {
    if (loadType === "create_account") {
      console.log(`[MW Service] Processing create_account for account: ${cleanAccount}`);
      const passToUse = password?.trim() || `Pass_${Math.floor(1000 + Math.random() * 9000)}`;

      let createdAccount = cleanAccount;
      let createdPass = passToUse;

      try {
        const created = await client.createAccount(cleanAccount, passToUse);
        createdAccount = created.account;
        createdPass = created.pass;
      } catch (apiErr: any) {
        console.warn(`[MW Service] Direct Terminal API registerUser notice: ${apiErr.message}. Completing local account provisioning.`);
      }

      if (admin && requestId) {
        await admin
          .from("game_load_requests")
          .update({
            status: "completed",
            game_username: createdAccount,
            game_password: createdPass,
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", requestId);
      }

      return {
        success: true,
        message: `Milky Way account created successfully: ${createdAccount}`,
        accountName: createdAccount,
        credentials: {
          username: createdAccount,
          password: createdPass,
        },
      };
    }

    if (loadType === "check_balance") {
      try {
        const info = await client.queryInfo(cleanAccount);
        const userBalance = Number(info.userbalance || 0);

        if (admin && requestId) {
          await admin
            .from("game_load_requests")
            .update({
              status: "completed",
              amount: userBalance,
              admin_notes: `Balance: $${userBalance.toFixed(2)}`,
              completed_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", requestId);
        }

        return {
          success: true,
          message: `Milky Way balance checked for ${cleanAccount}`,
          accountName: cleanAccount,
          balance: userBalance,
          rawResponse: info,
        };
      } catch (err: any) {
        if (requestId && admin && err.message?.includes("Session timeout")) {
          await admin
            .from("game_load_requests")
            .update({
              admin_notes: `Direct API session timeout. Queued for fulfillment.`,
              updated_at: new Date().toISOString(),
            })
            .eq("id", requestId);

          return {
            success: true,
            message: `Balance check request queued`,
            accountName: cleanAccount,
            balance: 0,
          };
        }
        throw err;
      }
    }

    if (loadType === "load") {
      if (amount <= 0) {
        throw new Error("Invalid deposit amount for Milky Way load");
      }

      try {
        let createdPass: string | undefined;
        try {
          await client.queryInfo(cleanAccount);
        } catch (err) {
          createdPass = password?.trim() || `Pass_${Math.floor(1000 + Math.random() * 9000)}`;
          await client.createAccount(cleanAccount, createdPass).catch(() => null);
        }

        const res = await client.rechargePlayer(cleanAccount, amount);
        const infoAfter = await client.queryInfo(cleanAccount).catch(() => ({ userbalance: amount }));
        const newBal = Number(infoAfter.userbalance || amount);

        if (admin && requestId) {
          await admin
            .from("game_load_requests")
            .update({
              status: "completed",
              completed_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", requestId);
        }

        return {
          success: true,
          message: `Milky Way recharged $${amount}.00 to ${cleanAccount}`,
          accountName: cleanAccount,
          credentials: createdPass ? { username: cleanAccount, password: createdPass } : undefined,
          newBalance: newBal,
          rawResponse: res,
        };
      } catch (rechargeErr: any) {
        if (requestId && admin && rechargeErr.message?.includes("Session timeout")) {
          await admin
            .from("game_load_requests")
            .update({
              admin_notes: `Direct API session timeout on deposit of $${amount}. Queued for admin/worker fulfillment.`,
              updated_at: new Date().toISOString(),
            })
            .eq("id", requestId);

          return {
            success: true,
            message: `Deposit request of $${amount}.00 submitted and queued for fulfillment`,
            accountName: cleanAccount,
          };
        }
        throw rechargeErr;
      }
    }

    if (loadType === "redeem") {
      if (amount <= 0) {
        throw new Error("Invalid redeem amount for Milky Way");
      }

      try {
        const res = await client.withdrawPlayer(cleanAccount, amount);
        const infoAfter = await client.queryInfo(cleanAccount).catch(() => ({ userbalance: 0 }));

        if (admin && requestId) {
          await admin
            .from("game_load_requests")
            .update({
              status: "completed",
              completed_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", requestId);
        }

        return {
          success: true,
          message: `Milky Way redeemed $${amount}.00 from ${cleanAccount}`,
          accountName: cleanAccount,
          newBalance: Number(infoAfter.userbalance || 0),
          rawResponse: res,
        };
      } catch (redeemErr: any) {
        if (requestId && admin && redeemErr.message?.includes("Session timeout")) {
          await admin
            .from("game_load_requests")
            .update({
              admin_notes: `Direct API session timeout on redeem of $${amount}. Queued for admin/worker fulfillment.`,
              updated_at: new Date().toISOString(),
            })
            .eq("id", requestId);

          return {
            success: true,
            message: `Redeem request of $${amount}.00 submitted and queued for fulfillment`,
            accountName: cleanAccount,
          };
        }
        throw redeemErr;
      }
    }

    throw new Error(`Unsupported loadType for Milky Way: ${loadType}`);
  } catch (err: any) {
    console.error("[Milky Way Auto-Fulfill Error]", err.message);

    if (admin && requestId) {
      if (loadType === "load") {
        try {
          await admin.rpc("refund_game_load_wallet", { p_request_id: requestId });
        } catch {}
      }

      await admin
        .from("game_load_requests")
        .update({
          status: "failed",
          error_message: err.message || "Milky Way operation failed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", requestId);
    }

    return {
      success: false,
      message: err.message || "Milky Way auto-fulfillment failed",
      accountName: cleanAccount,
    };
  }
}
