import { createAdminClient } from "@/lib/supabase/admin";
import { formatGameAutomationError } from "./error-formatter";
import {
  getGameVaultApiClient,
  GameVaultApiClient,
} from "./gamevault-api";

export function isGameVaultApiConfigured(): boolean {
  const agentId = process.env.GAMEVAULT_AGENT_ID || "158408";
  const secretKey = process.env.GAMEVAULT_SECRET_KEY || "352a22adfdc2675cf6b90e621fa687dd";
  return Boolean(agentId?.trim() && secretKey?.trim());
}

export async function createGameVaultAccount(
  params: { username: string; password?: string },
  client?: GameVaultApiClient
) {
  const api = client || getGameVaultApiClient();
  const password = params.password || "123123";
  const res = await api.addUser(params.username, password);
  return {
    success: true,
    account: res.data.account_name,
    password,
    userId: res.data.user_id,
  };
}

export async function rechargeGameVaultAccount(
  params: { usernameOrId: string | number; amount: number | string; orderId?: string },
  client?: GameVaultApiClient
) {
  const api = client || getGameVaultApiClient();
  const res = await api.recharge(params.usernameOrId, params.amount, params.orderId);
  return { success: true, balance: parseFloat(res.data.user_balance) || 0 };
}

export async function withdrawGameVaultAccount(
  params: { usernameOrId: string | number; amount: number | string; orderId?: string },
  client?: GameVaultApiClient
) {
  const api = client || getGameVaultApiClient();
  const res = await api.withdraw(params.usernameOrId, params.amount, params.orderId);
  return { success: true, balance: parseFloat(res.data.user_balance) || 0 };
}

export async function getGameVaultAccountBalance(
  usernameOrId: string | number,
  client?: GameVaultApiClient
) {
  const api = client || getGameVaultApiClient();
  const res = await api.getUserBalance(usernameOrId);
  return { success: true, balance: parseFloat(res.data.user_balance) || 0 };
}

export async function autoFulfillGameVaultRequest(
  requestId: string,
  loadType: "create_account" | "new_account" | "check_balance" | "load" | "reload" | "redeem",
  input: {
    userId: string;
    gameUsername?: string | null;
    amount?: number | null;
    requestedUsername?: string | null;
    requestedPassword?: string | null;
  }
): Promise<{ success: boolean; error?: string }> {
  if (!isGameVaultApiConfigured()) {
    return { success: false, error: "Game Vault API credentials not configured." };
  }

  const admin = createAdminClient();
  if (!admin) return { success: false, error: "Database admin client unavailable." };

  try {
    if (loadType === "create_account" || loadType === "new_account") {
      const username = input.requestedUsername || `GV${Math.floor(100000 + Math.random() * 900000)}`;
      const password = input.requestedPassword || `Pass_${Math.floor(1000 + Math.random() * 9000)}`;
      const created = await createGameVaultAccount({ username, password });

      await admin
        .from("game_load_requests")
        .update({
          status: "completed",
          game_username: created.account,
          game_password: created.password,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      return { success: true };
    }

    if (loadType === "check_balance") {
      const username = input.gameUsername?.trim();
      if (!username) throw new Error("Game username missing");

      const scoreInfo = await getGameVaultAccountBalance(username);

      await admin
        .from("game_load_requests")
        .update({
          status: "completed",
          amount: scoreInfo.balance,
          admin_notes: `Balance: $${scoreInfo.balance.toFixed(2)}`,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      return { success: true };
    }

    if (loadType === "load" || loadType === "reload") {
      const username = input.gameUsername?.trim();
      const amount = input.amount || 0;
      if (!username) throw new Error("Game username missing");

      const orderId = `job_${requestId.replace(/[^a-zA-Z0-9]/g, "")}`.slice(0, 32);
      await rechargeGameVaultAccount({ usernameOrId: username, amount, orderId });

      await admin
        .from("game_load_requests")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      return { success: true };
    }

    if (loadType === "redeem") {
      const username = input.gameUsername?.trim();
      const amount = input.amount || 0;
      if (!username) throw new Error("Game username missing");

      const orderId = `job_${requestId.replace(/[^a-zA-Z0-9]/g, "")}`.slice(0, 32);
      await withdrawGameVaultAccount({ usernameOrId: username, amount, orderId });

      await admin
        .from("game_load_requests")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      return { success: true };
    }

    return { success: false, error: `Unknown load type: ${loadType}` };
  } catch (err: any) {
    const userError = formatGameAutomationError(err, input.amount);

    if (loadType === "load" || loadType === "reload") {
      try {
        await admin.rpc("refund_game_load_wallet", { p_request_id: requestId });
      } catch {}
    }

    await admin
      .from("game_load_requests")
      .update({
        status: "failed",
        error_message: userError,
        updated_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    return { success: false, error: userError };
  }
}
