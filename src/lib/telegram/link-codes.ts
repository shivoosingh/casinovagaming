// Rules for the one-time /start codes that tie a Telegram identity to a
// Casinova account. Pure (no imports) so the self-check script can run them;
// the DB reads/writes live in linking.ts.

/** Which bot a link belongs to. `player` is the Casinova name for WinSweeps' `customer`. */
export type TelegramBotPurpose = "admin" | "player";

export const LINK_CODE_TTL_MINUTES = 10;

export type LinkCodeRow = {
  purpose: string;
  expires_at: string;
  consumed_at: string | null;
};

export type LinkCodeStatus = "ok" | "invalid" | "wrong_purpose" | "consumed" | "expired";

export function linkCodeStatus(row: LinkCodeRow | null | undefined, purpose: TelegramBotPurpose, now: Date): LinkCodeStatus {
  if (!row) return "invalid";
  if (row.purpose !== purpose) return "wrong_purpose";
  if (row.consumed_at) return "consumed";
  if (new Date(row.expires_at).getTime() < now.getTime()) return "expired";
  return "ok";
}

/** 32 hex chars: a UUID with the dashes removed (Telegram's start payload must be [A-Za-z0-9_-]{1,64}). */
export function newLinkCode(uuid: string): string {
  return uuid.replace(/-/g, "");
}

export function deepLinkFor(botUsername: string, code: string): string {
  return `https://t.me/${botUsername.replace(/^@/, "")}?start=${code}`;
}
