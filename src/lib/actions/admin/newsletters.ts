"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  type AdminActionResult,
  adminDb,
  authorize,
  isMissingRelation,
  RUN_ADMIN_SQL_HINT,
  writeAudit,
} from "@/lib/actions/admin/core";

const PERMISSION = "newsletters.manage";

function revalidateNewsletters() {
  revalidatePath("/admin/newsletters");
}

const campaignSchema = z.object({
  name: z.string().trim().min(2).max(160),
  subject: z.string().trim().min(2).max(200),
  heading: z.string().trim().min(2).max(200),
  body: z.string().trim().max(5000).optional().default(""),
  cta_label: z.string().trim().max(60).optional().default("Play Now"),
  cta_href: z.string().trim().max(300).optional().default("/"),
  segment: z.enum(["all", "test"]),
});

export async function upsertNewsletterCampaignAction(
  input: z.infer<typeof campaignSchema> & { id?: string }
): Promise<AdminActionResult> {
  const auth = await authorize(PERMISSION);
  if ("error" in auth) return { ok: false, error: auth.error };

  const parsed = campaignSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };

  const payload = {
    name: parsed.data.name,
    subject: parsed.data.subject,
    heading: parsed.data.heading,
    body: parsed.data.body || "",
    cta_label: parsed.data.cta_label || "Play Now",
    cta_href: parsed.data.cta_href || "/",
    segment: parsed.data.segment,
    created_by: auth.staff.userId,
  };

  const db = adminDb();
  const result = input.id
    ? await db.from("newsletter_campaigns").update(payload).eq("id", input.id)
    : await db.from("newsletter_campaigns").insert(payload);

  if (result.error) {
    if (isMissingRelation(result.error)) return { ok: false, error: RUN_ADMIN_SQL_HINT };
    return { ok: false, error: result.error.message };
  }

  await writeAudit({
    actorId: auth.staff.userId,
    action: input.id ? "newsletter.update" : "newsletter.create",
    entityType: "newsletter_campaign",
    entityId: input.id ?? null,
    after: payload,
  });

  revalidateNewsletters();
  return { ok: true, message: "Campaign saved." };
}

export async function deleteNewsletterCampaignAction(id: string): Promise<AdminActionResult> {
  const auth = await authorize(PERMISSION);
  if ("error" in auth) return { ok: false, error: auth.error };

  const { error } = await adminDb().from("newsletter_campaigns").delete().eq("id", id);
  if (error) {
    if (isMissingRelation(error)) return { ok: false, error: RUN_ADMIN_SQL_HINT };
    return { ok: false, error: error.message };
  }

  await writeAudit({ actorId: auth.staff.userId, action: "newsletter.delete", entityType: "newsletter_campaign", entityId: id });
  revalidateNewsletters();
  return { ok: true, message: "Campaign deleted." };
}

/** "Sends" a campaign by queueing an in-app notification per recipient —
 * no external email pipeline required. `test` segment only notifies staff. */
export async function sendNewsletterCampaignAction(id: string): Promise<AdminActionResult> {
  const auth = await authorize(PERMISSION);
  if ("error" in auth) return { ok: false, error: auth.error };

  const db = adminDb();
  const { data: campaign, error: campaignError } = await db
    .from("newsletter_campaigns")
    .select("id, subject, heading, body, segment, status")
    .eq("id", id)
    .single();

  if (campaignError || !campaign) {
    if (isMissingRelation(campaignError)) return { ok: false, error: RUN_ADMIN_SQL_HINT };
    return { ok: false, error: campaignError?.message ?? "Campaign not found." };
  }
  if (campaign.status === "sent" || campaign.status === "sending") {
    return { ok: false, error: "This campaign was already sent." };
  }

  const query =
    campaign.segment === "test"
      ? db.from("profiles").select("id").eq("role", "admin")
      : db.from("profiles").select("id").eq("role", "user");
  const { data: recipients, error: recipientsError } = await query;
  if (recipientsError) return { ok: false, error: recipientsError.message };

  const rows = recipients ?? [];
  const preview = campaign.body ? `${campaign.heading} — ${campaign.body}` : campaign.heading;
  const message = preview.length > 300 ? `${preview.slice(0, 297)}...` : preview;

  const BATCH = 500;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH).map((r) => ({
      user_id: r.id,
      title: campaign.subject,
      message,
      type: "promo" as const,
    }));
    if (chunk.length) {
      const { error } = await db.from("notifications").insert(chunk);
      if (error) return { ok: false, error: error.message };
    }
  }

  const { error: updateError } = await db
    .from("newsletter_campaigns")
    .update({
      status: "sent",
      sent_at: new Date().toISOString(),
      sent_count: rows.length,
      total_recipients: rows.length,
    })
    .eq("id", id);
  if (updateError) return { ok: false, error: updateError.message };

  await writeAudit({
    actorId: auth.staff.userId,
    action: "newsletter.send",
    entityType: "newsletter_campaign",
    entityId: id,
    after: { recipients: rows.length, segment: campaign.segment },
  });

  revalidateNewsletters();
  return { ok: true, message: `Queued in-app notifications for ${rows.length} recipient(s).` };
}

/** Cron helper — send due campaigns in batches (same as manual send today). */
export async function processCampaignBatch(
  id: string
): Promise<{ ok: boolean; error?: string; message?: string }> {
  return sendNewsletterCampaignAction(id);
}
