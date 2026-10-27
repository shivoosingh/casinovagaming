// Minimal shape of a Telegram Bot API update, as delivered to our webhooks.
// Pure module (no imports) so the self-check script can load it on plain Node.
export type TelegramUpdate = {
  message?: {
    text?: string;
    chat: { id: number };
    from?: { id: number; username?: string; first_name?: string };
  };
};

/** Splits "/command@BotName arg1 arg2" into { command: "command", args: "arg1 arg2" }. */
export function parseCommand(text: string): { command: string; args: string } | null {
  const match = text.trim().match(/^\/(\w+)(?:@\w+)?\s*([\s\S]*)$/);
  if (!match) return null;
  return { command: match[1].toLowerCase(), args: match[2].trim() };
}
