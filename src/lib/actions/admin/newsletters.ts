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
import { generatePromoCopy } from "@/lib/email/generate-promo";
import { dayFolderId } from "@/lib/email/promo-catalog";
import { FREE_DAILY_CAP, sendPromoEmail, splitPromoImage } from "@/lib/email/resend";
import { isEmailOptedOut, optedOutEmailKeys } from "@/lib/email/unsubscribe";

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

function realPlayerEmail(email: string | null | undefined): string | null {
  const value = email?.trim().toLowerCase() ?? "";
  if (!value || !value.includes("@")) return null;
  if (value.endsWith("@phone.spinora.local") || value.endsWith("@phone.casinova.local")) return null;
  return value;
}

/** Writes a fresh promo and saves it as a draft for all players. */
export async function generatePromoCampaignAction(): Promise<AdminActionResult> {
  const auth = await authorize(PERMISSION);
  if ("error" in auth) return { ok: false, error: auth.error };

  let promo;
  try {
    promo = await generatePromoCopy();
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not write the promo." };
  }

  const db = adminDb();
  const { error } = await db.from("newsletter_campaigns").insert({
    name: promo.name.startsWith("[") ? promo.name : `[${dayFolderId()}] ${promo.name}`,
    subject: promo.subject,
    heading: promo.heading,
    body: promo.body,
    cta_label: promo.cta_label,
    cta_href: promo.cta_href,
    segment: "all",
    created_by: auth.staff.userId,
  });
  if (error) {
    if (isMissingRelation(error)) return { ok: false, error: RUN_ADMIN_SQL_HINT };
    return { ok: false, error: error.message };
  }

  revalidateNewsletters();
  return { ok: true, message: "Promo is ready in today's folder. Open that day, then choose Staff or Players." };
}

/** Emails the campaign. `staff` is a test to admin emails and does not finish the campaign. `players` emails every player. */
export async function sendNewsletterCampaignAction(
  id: string,
  audience: "staff" | "players" = "players"
): Promise<AdminActionResult> {
  const auth = await authorize(PERMISSION);
  if ("error" in auth) return { ok: false, error: auth.error };
  if (audience !== "staff" && audience !== "players") {
    return { ok: false, error: "Choose staff or players before sending." };
  }

  const db = adminDb();
  const { data: campaign, error: campaignError } = await db
    .from("newsletter_campaigns")
    .select("id, subject, heading, body, cta_label, cta_href, segment, status, sent_count")
    .eq("id", id)
    .single();

  if (campaignError || !campaign) {
    if (isMissingRelation(campaignError)) return { ok: false, error: RUN_ADMIN_SQL_HINT };
    return { ok: false, error: campaignError?.message ?? "Campaign not found." };
  }
  if (audience === "players" && campaign.status === "sent") {
    return { ok: false, error: "This campaign was already emailed to players." };
  }

  const query =
    audience === "staff"
      ? db.from("profiles").select("id, email").eq("role", "admin").order("id", { ascending: true })
      : db.from("profiles").select("id, email").eq("role", "user").order("id", { ascending: true });
  const { data: recipients, error: recipientsError } = await query;
  if (recipientsError) return { ok: false, error: recipientsError.message };

  const people = [...(recipients ?? [])];
  if (audience === "staff" && auth.staff.email) {
    const mine = realPlayerEmail(auth.staff.email);
    const alreadyIncluded = people.some(
      (row) => row.id === auth.staff.userId || realPlayerEmail(row.email as string | null) === mine
    );
    if (!alreadyIncluded) people.push({ id: auth.staff.userId, email: auth.staff.email });
  }

  const optedOut = await optedOutEmailKeys();
  const rows = people
    .map((row) => ({ id: row.id as string, email: realPlayerEmail(row.email as string | null) }))
    .filter((row): row is { id: string; email: string } => Boolean(row.email))
    .filter((row) => !isEmailOptedOut(row.email, optedOut));

  const alreadySent = audience === "players" && campaign.status === "sending" ? Number(campaign.sent_count ?? 0) : 0;
  const pending = rows.slice(alreadySent);
  if (pending.length === 0) {
    return {
      ok: false,
      error:
        audience === "staff"
          ? "No staff email to test with. Your admin account needs a real email address."
          : "No player emails left to send. Phone-only accounts are skipped.",
    };
  }

  const batch = pending.slice(0, FREE_DAILY_CAP);
  let emailed = 0;
  let stoppedEarly: string | null = null;

  for (const person of batch) {
    const result = await sendPromoEmail({
      to: person.email,
      subject: campaign.subject,
      heading: campaign.heading,
      body: campaign.body || campaign.heading,
      ctaLabel: campaign.cta_label || "Play now",
      ctaHref: campaign.cta_href || "/",
    });
    if (!result.ok) {
      stoppedEarly = result.error;
      break;
    }
    emailed += 1;
  }

  const sentCount = alreadySent + emailed;
  const finished = sentCount >= rows.length && !stoppedEarly;
  if (audience === "players") {
    const { error: updateError } = await db
      .from("newsletter_campaigns")
      .update({
        status: finished ? "sent" : emailed > 0 || alreadySent > 0 ? "sending" : "failed",
        sent_at: new Date().toISOString(),
        sent_count: sentCount,
        total_recipients: rows.length,
      })
      .eq("id", id);
    if (updateError) return { ok: false, error: updateError.message };
  }

  if (emailed > 0) {
    const previewText = splitPromoImage(campaign.body || "").text;
    const preview = previewText ? `${campaign.heading} — ${previewText}` : campaign.heading;
    const message = preview.length > 300 ? `${preview.slice(0, 297)}...` : preview;
    const noteRows = batch.slice(0, emailed).map((person) => ({
      user_id: person.id,
      title: campaign.subject,
      message,
      type: "promo" as const,
    }));
    if (noteRows.length) await db.from("notifications").insert(noteRows);
  }

  await writeAudit({
    actorId: auth.staff.userId,
    action: "newsletter.send",
    entityType: "newsletter_campaign",
    entityId: id,
    after: { emailed, sentCount, total: rows.length, audience },
  });

  revalidateNewsletters();

  if (emailed === 0) {
    return { ok: false, error: stoppedEarly || "No emails were sent." };
  }

  if (audience === "staff") {
    return {
      ok: true,
      message:
        emailed === 1
          ? "Test sent to your admin email. Players were not emailed."
          : `Test sent to ${emailed} staff emails. Players were not emailed.`,
    };
  }

  const leftover = rows.length - sentCount;
  if (leftover > 0) {
    return {
      ok: true,
      message: `Emailed ${emailed} player${emailed === 1 ? "" : "s"}. ${leftover} still waiting. Free Resend allows ${FREE_DAILY_CAP} a day, so click Send again tomorrow.`,
    };
  }

  return {
    ok: true,
    message: `Emailed ${emailed} player${emailed === 1 ? "" : "s"}.`,
  };
}

/** Cron helper — send due campaigns in batches (same as manual send today). */
export async function processCampaignBatch(
  id: string
): Promise<{ ok: boolean; error?: string; message?: string }> {
  return sendNewsletterCampaignAction(id);
}
