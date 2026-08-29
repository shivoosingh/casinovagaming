/**
 * User-Friendly Error Formatting for Game Automation & Auto-Fulfillment
 */

export function formatGameAutomationError(
  rawError: any,
  amount?: number | null
): string {
  const msg = (rawError?.message || String(rawError)).trim();

  // Insufficient agent balance (e.g. user wants $40, but agent server only has $30)
  if (/insufficient agent|agent balance|insufficient balance|code 6|code: 6/i.test(msg)) {
    const amtStr = amount ? ` $${amount.toFixed(2)}` : "";
    return `Agent store wallet limit reached: The game agent server has insufficient credits to process your${amtStr} load right now. Your money has been fully refunded to your wallet balance. Please try a smaller load or contact live support.`;
  }

  // Player in game lock
  if (/still in the game|return to the game lobby|code 10|in game/i.test(msg)) {
    return "Player is currently active inside a game room. Please exit to the game lobby in your app and try again.";
  }

  // Account name format
  if (/nickname can only be letters|remarks can only be letters/i.test(msg)) {
    return "Account format error. Please try again with letters and numbers.";
  }

  // Game Vault IP Whitelist Error
  if (/not white ip|whitelist|access ip/i.test(msg)) {
    return "Game Vault Store API authorization required: Please add your exact server IP in Game Vault Admin (agent.gamevault999.com) -> API Settings or contact your Master Agent to activate API store permissions. Your funds have been 100% refunded to your wallet balance.";
  }

  // Game Vault System Abnormal Error (Account already exists or invalid username)
  if (/system is abnormal|abnormal|code 21|code 20/i.test(msg)) {
    return "Account name is already taken or unavailable on Game Vault. Please try a different username or use Replace Account.";
  }

  return msg;
}
