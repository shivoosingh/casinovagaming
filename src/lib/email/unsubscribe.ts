import "server-only";

import { createHmac, timingSafeEqual } from "crypto";

import { createAdminClient } from "@/lib/supabase/admin";
import { SITE_URL } from "@/lib/constants";

function secret(): string {
  return process.env.RESEND_API_KEY?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "casinova-email";
}

function sign(email: string): string {
  return createHmac("sha256", secret()).update(email).digest("base64url");
}

export function unsubscribeToken(email: string): string {
  const normalized = email.trim().toLowerCase();
  const payload = Buffer.from(normalized, "utf8").toString("base64url");
  return `${payload}.${sign(normalized)}`;
}

export function emailFromUnsubscribeToken(token: string): string | null {
  const splitAt = token.lastIndexOf(".");
  if (splitAt <= 0) return null;
  const payload = token.slice(0, splitAt);
  const sig = token.slice(splitAt + 1);
  let email = "";
  try {
    email = Buffer.from(payload, "base64url").toString("utf8").trim().toLowerCase();
  } catch {
    return null;
  }
  if (!email.includes("@")) return null;
  const expected = sign(email);
  const left = Buffer.from(sig);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  return email;
}

export function unsubscribeUrl(email: string): string {
  return `${SITE_URL}/api/email/unsubscribe?token=${encodeURIComponent(unsubscribeToken(email))}`;
}

function optOutKey(email: string): string {
  const mac = createHmac("sha256", secret()).update(`optout:${email.trim().toLowerCase()}`).digest("hex");
  return `email_opt_out:${mac}`;
}

export async function recordEmailOptOut(email: string): Promise<void> {
  const db = createAdminClient();
  if (!db) return;
  await db.from("site_settings").upsert(
    {
      key: optOutKey(email),
      value: { at: new Date().toISOString() },
      description: "Promo email opt-out",
    },
    { onConflict: "key" }
  );
}

export async function optedOutEmailKeys(): Promise<Set<string>> {
  const db = createAdminClient();
  if (!db) return new Set();
  const { data, error } = await db.from("site_settings").select("key").like("key", "email_opt_out:%");
  if (error || !data) return new Set();
  return new Set(data.map((row) => String(row.key)));
}

export function isEmailOptedOut(email: string, keys: Set<string>): boolean {
  return keys.has(optOutKey(email));
}
