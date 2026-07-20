"use server";

import { revalidatePath } from "next/cache";
import { adminDb, authorize, writeAudit, type AdminActionResult } from "./core";

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

export async function upsertPromotion(formData: FormData): Promise<AdminActionResult> {
  const auth = await authorize("promotions.manage");
  if ("error" in auth) return { ok: false, error: auth.error };

  const id = String(formData.get("id") ?? "").trim() || null;
  const title = String(formData.get("title") ?? "").trim();
  const summary = String(formData.get("summary") ?? "").trim();
  const status = String(formData.get("status") ?? "draft") as "draft" | "active" | "paused" | "ended";
  if (!title) return { ok: false, error: "Title required." };

  const db = adminDb();
  const row = {
    title,
    summary,
    slug: slugify(title) || `promo-${Date.now()}`,
    status,
    description: String(formData.get("description") ?? ""),
    updated_at: new Date().toISOString(),
  };

  if (id) {
    const { error } = await db.from("promotions").update(row).eq("id", id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await db.from("promotions").insert({ ...row, created_by: auth.staff.userId });
    if (error) return { ok: false, error: error.message };
  }

  await writeAudit({
    actorId: auth.staff.userId,
    action: id ? "promotion.update" : "promotion.create",
    entityType: "promotion",
    entityId: id,
    after: row,
  });
  revalidatePath("/admin/promotions");
  return { ok: true, message: "Promotion saved." };
}

export async function deletePromotion(id: string): Promise<AdminActionResult> {
  const auth = await authorize("promotions.manage");
  if ("error" in auth) return { ok: false, error: auth.error };
  const { error } = await adminDb().from("promotions").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/promotions");
  return { ok: true, message: "Deleted." };
}

export async function upsertRewardRule(formData: FormData): Promise<AdminActionResult> {
  const auth = await authorize("rewards.manage");
  if ("error" in auth) return { ok: false, error: auth.error };
  const id = String(formData.get("id") ?? "").trim() || null;
  const key = String(formData.get("key") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const amount = Number(formData.get("amount"));
  if (!key || !title) return { ok: false, error: "Key and title required." };
  const row = {
    key,
    title,
    description: String(formData.get("description") ?? ""),
    amount: Number.isFinite(amount) ? amount : 0,
    wallet_type: String(formData.get("wallet_type") ?? "current"),
    is_active: formData.get("is_active") === "on" || formData.get("is_active") === "true",
  };
  const db = adminDb();
  if (id) {
    const { error } = await db.from("reward_rules").update(row).eq("id", id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await db.from("reward_rules").insert(row);
    if (error) return { ok: false, error: error.message };
  }
  revalidatePath("/admin/rewards");
  return { ok: true, message: "Reward rule saved." };
}

export async function upsertAchievement(formData: FormData): Promise<AdminActionResult> {
  const auth = await authorize("achievements.manage");
  if ("error" in auth) return { ok: false, error: auth.error };
  const id = String(formData.get("id") ?? "").trim() || null;
  const key = String(formData.get("key") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  if (!key || !title) return { ok: false, error: "Key and title required." };
  const row = {
    key,
    title,
    description: String(formData.get("description") ?? ""),
    points: Number(formData.get("points")) || 0,
    is_active: formData.get("is_active") !== "false",
  };
  const db = adminDb();
  if (id) {
    const { error } = await db.from("achievements").update(row).eq("id", id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await db.from("achievements").insert(row);
    if (error) return { ok: false, error: error.message };
  }
  revalidatePath("/admin/achievements");
  return { ok: true, message: "Achievement saved." };
}

export async function recomputeLeaderboard(board = "deposits"): Promise<AdminActionResult> {
  const auth = await authorize("leaderboards.manage");
  if ("error" in auth) return { ok: false, error: auth.error };
  const { data, error } = await adminDb().rpc("compute_leaderboard", { p_board: board });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/leaderboards");
  return { ok: true, message: `Recomputed — ${data ?? 0} entries.` };
}

export async function upsertGeoState(formData: FormData): Promise<AdminActionResult> {
  const auth = await authorize("cms.manage");
  if ("error" in auth) return { ok: false, error: auth.error };
  const id = String(formData.get("id") ?? "").trim() || null;
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { ok: false, error: "Name required." };
  const row = {
    name,
    slug: slugify(name) || `state-${Date.now()}`,
    content: String(formData.get("content") ?? ""),
    is_published: formData.get("is_published") === "on" || formData.get("is_published") === "true",
  };
  const db = adminDb();
  if (id) {
    const { error } = await db.from("geo_states").update(row).eq("id", id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await db.from("geo_states").insert(row);
    if (error) return { ok: false, error: error.message };
  }
  revalidatePath("/admin/geo");
  return { ok: true, message: "Geo state saved." };
}

export async function upsertSiteSetting(formData: FormData): Promise<AdminActionResult> {
  const auth = await authorize("settings.manage");
  if ("error" in auth) return { ok: false, error: auth.error };
  const key = String(formData.get("key") ?? "").trim();
  const raw = String(formData.get("value") ?? "").trim();
  if (!key) return { ok: false, error: "Key required." };
  let value: unknown = raw;
  try {
    value = JSON.parse(raw);
  } catch {
    value = { text: raw };
  }
  const { error } = await adminDb()
    .from("site_settings")
    .upsert({ key, value, updated_by: auth.staff.userId, updated_at: new Date().toISOString() });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/settings");
  return { ok: true, message: "Setting saved." };
}

export async function updateTicketStatus(ticketId: string, status: string): Promise<AdminActionResult> {
  const auth = await authorize("support.manage");
  if ("error" in auth) return { ok: false, error: auth.error };
  const { error } = await adminDb()
    .from("support_tickets")
    .update({
      status,
      closed_at: status === "closed" || status === "resolved" ? new Date().toISOString() : null,
    })
    .eq("id", ticketId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/support");
  return { ok: true, message: "Ticket updated." };
}

export async function createNewsletterCampaign(formData: FormData): Promise<AdminActionResult> {
  const auth = await authorize("newsletters.manage");
  if ("error" in auth) return { ok: false, error: auth.error };
  const subject = String(formData.get("subject") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (!subject || !body) return { ok: false, error: "Subject and body required." };

  const db = adminDb();
  const { count } = await db.from("profiles").select("id", { count: "exact", head: true }).neq("role", "admin");

  const { data, error } = await db
    .from("newsletter_campaigns")
    .insert({
      subject,
      body,
      status: "draft",
      recipient_count: count ?? 0,
      created_by: auth.staff.userId,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  // Send as in-app notifications (Resend email campaigns can be wired later)
  const { data: users } = await db.from("profiles").select("id").neq("role", "admin").limit(5000);
  if (users?.length) {
    const rows = users.map((u) => ({
      user_id: u.id,
      type: "promo" as const,
      title: subject,
      message: body.slice(0, 500),
    }));
    await db.from("notifications").insert(rows);
    await db
      .from("newsletter_campaigns")
      .update({ status: "sent", sent_at: new Date().toISOString(), recipient_count: users.length })
      .eq("id", data.id);
  }

  await writeAudit({
    actorId: auth.staff.userId,
    action: "newsletter.send",
    entityType: "newsletter_campaign",
    entityId: data.id,
    after: { subject, count: users?.length ?? 0 },
  });
  revalidatePath("/admin/newsletters");
  return { ok: true, message: `Campaign sent to ${users?.length ?? 0} users (in-app).` };
}

export async function upsertPaymentMethod(formData: FormData): Promise<AdminActionResult> {
  const auth = await authorize("cms.manage");
  if ("error" in auth) return { ok: false, error: auth.error };
  const id = String(formData.get("id") ?? "").trim() || null;
  const key = String(formData.get("key") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim();
  const handle = String(formData.get("handle") ?? "").trim();
  if (!key || !label) return { ok: false, error: "Key and label required." };
  const row = {
    key,
    label,
    handle,
    is_active: formData.get("is_active") !== "false",
    sort_order: Number(formData.get("sort_order")) || 100,
  };
  const db = adminDb();
  if (id) {
    const { error } = await db.from("payment_methods").update(row).eq("id", id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await db.from("payment_methods").upsert(row, { onConflict: "key" });
    if (error) return { ok: false, error: error.message };
  }
  revalidatePath("/admin/payments");
  return { ok: true, message: "Payment method saved." };
}
