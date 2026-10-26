import { createAdminClient } from "@/lib/supabase/admin";
import { SITE_URL } from "@/lib/constants";
import { escapeTelegramHtml, isTelegramConfigured, sendTelegramMessage } from "@/lib/telegram/client";

const NOTIFIED_KEY = "signup_telegram_notified";
const FRESH_MS = 6 * 60 * 60 * 1000;

/** One Telegram alert per new player. Skips admins and accounts older than a few hours. */
export async function notifyAdminOfSignup(userId: string): Promise<void> {
  if (!isTelegramConfigured()) return;

  const admin = createAdminClient();
  if (!admin) return;

  const { data: profile } = await admin
    .from("profiles")
    .select("full_name, email, phone, role, created_at")
    .eq("id", userId)
    .maybeSingle();

  if (!profile || profile.role === "admin") return;

  const createdAt = profile.created_at ? new Date(profile.created_at).getTime() : 0;
  if (!createdAt || Date.now() - createdAt > FRESH_MS) return;

  const { data: authData, error: authError } = await admin.auth.admin.getUserById(userId);
  if (authError || !authData.user) return;

  const meta = (authData.user.user_metadata ?? {}) as Record<string, unknown>;
  if (meta[NOTIFIED_KEY] === true) return;

  const displayName =
    profile.full_name?.trim() || profile.email?.split("@")[0] || "New player";
  const email = profile.email ?? authData.user.email ?? "unknown";
  const phone = profile.phone?.trim();
  const playersUrl = `${SITE_URL}/admin/users`;

  const lines = [
    "🆕 <b>New player signup</b>",
    "",
    `<b>Name:</b> ${escapeTelegramHtml(displayName)}`,
    `<b>Email:</b> ${escapeTelegramHtml(email)}`,
  ];
  if (phone) lines.push(`<b>Phone:</b> ${escapeTelegramHtml(phone)}`);
  lines.push("", `<a href="${playersUrl}">Open players in Casinova</a>`);

  const result = await sendTelegramMessage(lines.join("\n"));
  if (!result.ok) {
    console.error("[telegram] signup notify failed:", result.error);
    return;
  }

  await admin.auth.admin.updateUserById(userId, {
    user_metadata: { ...meta, [NOTIFIED_KEY]: true },
  });
}
