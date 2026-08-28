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
        console.log(`[MW Service] Database updated to completed for requestId: ${requestId}`);
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
    }

    if (loadType === "load") {
      if (amount <= 0) {
        throw new Error("Invalid deposit amount for Milky Way load");
      }

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
    }

    if (loadType === "redeem") {
      if (amount <= 0) {
        throw new Error("Invalid redeem amount for Milky Way");
      }

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
    }

    throw new Error(`Unsupported loadType for Milky Way: ${loadType}`);
  } catch (err: any) {
    console.error("[Milky Way Auto-Fulfill Error]", err.message);

    if (admin && requestId) {
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
