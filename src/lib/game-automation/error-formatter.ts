/**
 * User-Friendly Error Formatting for Game Automation & Auto-Fulfillment
 * 
 * Game Vault Status Code Dictionary (Official API Documentation):
 * 0   = Success
 * 1   = Invalid agent ID
 * 2   = Invalid request parameters
 * 3   = Invalid token
 * 4   = Token expired
 * 5   = Access IP is not whitelist IP
 * 6   = Insufficient agent balance
 * 7   = Insufficient user balance
 * 8   = Invalid user ID
 * 9   = User account frozen
 * 10  = User is in game
 * 11  = Invalid amount
 * 12  = Recharge failed
 * 13  = Recharge permission denied
 * 14  = Withdrawal failed
 * 15  = Withdrawal amount exceeds daily limit
 * 16  = Withdrawal under review
 * 17  = Withdrawal permission denied
 * 18  = Account name format error
 * 19  = Agent has no register-user permission
 * 20  = Account name already exists
 * 21  = System failed / System abnormal
 * 22  = Registration IP limit exceeded
 * 23  = Password must be 6-32 characters
 * 400 = Parameter error / System abnormal
 */

export function formatGameAutomationError(
  rawError: any,
  amount?: number | null
): string {
  const msg = (rawError?.message || String(rawError)).trim();
  const code = rawError?.code;

  const amtStr = amount ? ` $${amount.toFixed(2)}` : "";

  if (code === 1 || /code 1\b|invalid agent id/i.test(msg)) {
    return "Game Vault API authentication failed: Invalid agent ID. Please check store agent credentials.";
  }

  if (code === 2 || /code 2\b|invalid request parameters/i.test(msg)) {
    return "Invalid request parameters sent to Game Vault API.";
  }

  if (code === 3 || /code 3\b|invalid token/i.test(msg)) {
    return "Game Vault API authentication failed: Invalid token / MD5 signature mismatch.";
  }

  if (code === 4 || /code 4\b|token expired/i.test(msg)) {
    return "Game Vault API token expired. Please try again.";
  }

  if (code === 5 || /code 5\b|not white ip|whitelist|access ip/i.test(msg)) {
    return "Game Vault Store API authorization required: Access IP is not in Game Vault whitelist (Code 5).";
  }

  if (code === 6 || /code 6\b|insufficient agent balance|insufficient balance/i.test(msg)) {
    return `Agent store wallet limit reached: The game agent server has insufficient credits to process your${amtStr} load right now (Code 6). Your funds have been 100% refunded to your wallet balance.`;
  }

  if (code === 7 || /code 7\b|insufficient user balance/i.test(msg)) {
    return "Insufficient player balance in your Game Vault account for this redeem amount (Code 7).";
  }

  if (code === 8 || /code 8\b|invalid user id/i.test(msg)) {
    return "Invalid Game Vault user ID. Account not found on Game Vault server (Code 8).";
  }

  if (code === 9 || /code 9\b|user account frozen|account frozen/i.test(msg)) {
    return "Your Game Vault player account is frozen on provider server (Code 9).";
  }

  if (code === 10 || /code 10\b|still in the game|return to the game lobby|user is in game|in game/i.test(msg)) {
    return "Player is currently active inside a game room. Please exit to the game lobby in your app and try again (Code 10).";
  }

  if (code === 11 || /code 11\b|invalid amount/i.test(msg)) {
    return "Invalid load or redeem amount for Game Vault (Code 11).";
  }

  if (code === 12 || /code 12\b|recharge failed/i.test(msg)) {
    return "Game Vault deposit failed on provider server (Code 12).";
  }

  if (code === 13 || /code 13\b|recharge permission denied/i.test(msg)) {
    return "Deposit permission denied for this Game Vault agent account (Code 13).";
  }

  if (code === 14 || /code 14\b|withdrawal failed/i.test(msg)) {
    return "Game Vault redeem/withdrawal failed on provider server (Code 14).";
  }

  if (code === 15 || /code 15\b|withdrawal amount exceeds daily limit/i.test(msg)) {
    return "Redeem amount exceeds Game Vault daily withdrawal limit (Code 15).";
  }

  if (code === 16 || /code 16\b|withdrawal under review/i.test(msg)) {
    return "Game Vault withdrawal is currently under review by provider (Code 16).";
  }

  if (code === 17 || /code 17\b|withdrawal permission denied/i.test(msg)) {
    return "Redeem permission denied for this Game Vault agent account (Code 17).";
  }

  if (code === 18 || /code 18\b|account name format error|nickname can only be letters/i.test(msg)) {
    return "Account name format error (Code 18). Game Vault account names must contain only letters and numbers (no underscores or special characters).";
  }

  if (code === 19 || /code 19\b|no register-user permission|no register user permission/i.test(msg)) {
    return "Agent has no register-user permission on Game Vault provider (Code 19).";
  }

  if (code === 20 || /code 20\b|account name already exists/i.test(msg)) {
    return "Account name already exists on Game Vault (Code 20).";
  }

  if (code === 21 || code === 400 || /code 21\b|system failed|system is abnormal|abnormal/i.test(msg)) {
    return "GameVault provider returned a system error (code 21 / status 400). Please ensure account username contains only letters and numbers.";
  }

  if (code === 22 || /code 22\b|number of registration ips exceeds upper limit/i.test(msg)) {
    return "Registration limit reached: Number of registration IPs exceeds upper limit (Code 22).";
  }

  if (code === 23 || /code 23\b|password must be 6-32 characters|password digits 6 to 32/i.test(msg)) {
    return "Password format error: Password must be 6 to 32 characters (Code 23).";
  }

  return msg;
}
