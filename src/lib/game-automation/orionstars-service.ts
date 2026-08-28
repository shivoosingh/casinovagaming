import { OrionStarsApiClient } from "./orionstars-api";

export interface AutoFulfillOrionStarsOptions {
  requestId?: string;
  gameSlug?: string;
  loadType: "create_account" | "check_balance" | "load" | "redeem";
  accountName: string;
  password?: string;
  amount?: number;
}

export interface AutoFulfillOrionStarsResult {
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

export async function autoFulfillOrionStarsRequest(
  options: AutoFulfillOrionStarsOptions
): Promise<AutoFulfillOrionStarsResult> {
  const client = new OrionStarsApiClient();

  const { loadType, accountName, password, amount = 0 } = options;
  const cleanAccount = accountName.trim();

  try {
    if (loadType === "create_account") {
      const passToUse = password?.trim() || `Pass_${Math.floor(1000 + Math.random() * 9000)}`;
      const created = await client.createAccount(cleanAccount, passToUse);

      return {
        success: true,
        message: `Orion Stars account created successfully: ${created.account}`,
        accountName: created.account,
        credentials: {
          username: created.account,
          password: created.pass,
        },
      };
    }

    if (loadType === "check_balance") {
      const info = await client.queryInfo(cleanAccount);
      const userBalance = Number(info.userbalance || 0);

      return {
        success: true,
        message: `Orion Stars balance checked for ${cleanAccount}`,
        accountName: cleanAccount,
        balance: userBalance,
        rawResponse: info,
      };
    }

    if (loadType === "load") {
      if (amount <= 0) {
        throw new Error("Invalid deposit amount for Orion Stars load");
      }

      // Check if account exists first, if not create account
      let accountExists = true;
      try {
        await client.queryInfo(cleanAccount);
      } catch (err) {
        accountExists = false;
      }

      let createdPass: string | undefined;
      if (!accountExists) {
        createdPass = password?.trim() || `Pass_${Math.floor(1000 + Math.random() * 9000)}`;
        await client.createAccount(cleanAccount, createdPass);
      }

      const res = await client.rechargePlayer(cleanAccount, amount);
      const infoAfter = await client.queryInfo(cleanAccount).catch(() => ({ userbalance: amount }));

      return {
        success: true,
        message: `Orion Stars recharged $${amount}.00 to ${cleanAccount}`,
        accountName: cleanAccount,
        credentials: createdPass ? { username: cleanAccount, password: createdPass } : undefined,
        newBalance: Number(infoAfter.userbalance || amount),
        rawResponse: res,
      };
    }

    if (loadType === "redeem") {
      if (amount <= 0) {
        throw new Error("Invalid redeem amount for Orion Stars");
      }

      const res = await client.withdrawPlayer(cleanAccount, amount);
      const infoAfter = await client.queryInfo(cleanAccount).catch(() => ({ userbalance: 0 }));

      return {
        success: true,
        message: `Orion Stars redeemed $${amount}.00 from ${cleanAccount}`,
        accountName: cleanAccount,
        newBalance: Number(infoAfter.userbalance || 0),
        rawResponse: res,
      };
    }

    throw new Error(`Unsupported loadType for Orion Stars: ${loadType}`);
  } catch (err: any) {
    console.error("[Orion Stars Auto-Fulfill Error]", err);
    return {
      success: false,
      message: err.message || "Orion Stars auto-fulfillment failed",
      accountName: cleanAccount,
    };
  }
}
