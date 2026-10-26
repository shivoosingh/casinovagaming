import { SITE_NAME, SITE_URL } from "@/lib/constants";
import { unsubscribeUrl } from "@/lib/email/unsubscribe";

const FREE_DAILY_CAP = 100;

/** Gmail already filed promos@ as spam. A normal mailbox name sends cleaner. */
export function resendFromAddress(): string {
  const configured = process.env.RESEND_FROM?.trim() || "";
  if (!configured || /promos@/i.test(configured)) {
    return `${SITE_NAME} <hello@casinovasgaming.com>`;
  }
  return configured;
}

/** Emoji in the subject is a common spam signal. The heading inside the email can still use them. */
export function inboxSubject(subject: string): string {
  return subject
    .replace(/\p{Extended_Pictographic}/gu, "")
    .replace(/[\uFE0F\u200D]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function isResendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Body may start with {{image:/email/banner.png}}. That line becomes the email banner. */
export function splitPromoImage(body: string): { imagePath: string | null; text: string } {
  const match = body.match(/^\{\{image:([^}]+)\}\}\s*/);
  if (!match) return { imagePath: null, text: body };
  return { imagePath: match[1].trim(), text: body.slice(match[0].length).trim() };
}

export function promoImageSrc(imagePath: string | null): string | null {
  if (!imagePath) return null;
  if (imagePath.startsWith("http")) return imagePath;
  return `${SITE_URL}${imagePath.startsWith("/") ? "" : "/"}${imagePath}`;
}

function absoluteHref(ctaHref: string): string {
  return ctaHref.startsWith("http")
    ? ctaHref
    : `${SITE_URL}${ctaHref.startsWith("/") ? "" : "/"}${ctaHref}`;
}

export function promoEmailText(input: {
  heading: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
  unsubscribeHref: string;
}): string {
  const { text } = splitPromoImage(input.body);
  return [
    input.heading,
    "",
    text,
    "",
    `${input.ctaLabel || "Deposit now"}: ${absoluteHref(input.ctaHref)}`,
    "",
    `${SITE_NAME}`,
    SITE_URL,
    "You are receiving this because you have a Casinova Gaming account. Play responsibly. 18+.",
    `Unsubscribe: ${input.unsubscribeHref}`,
  ].join("\n");
}

export function promoEmailHtml(input: {
  heading: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
  unsubscribeHref: string;
}): string {
  const href = absoluteHref(input.ctaHref);
  const { imagePath, text } = splitPromoImage(input.body);
  const imageSrc = promoImageSrc(imagePath);
  const paragraphs = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<p style="margin:0 0 14px;line-height:1.5;">${escapeHtml(line)}</p>`)
    .join("");
  const banner = imageSrc
    ? `<img src="${escapeHtml(imageSrc)}" alt="${escapeHtml(input.heading)}" width="520" style="display:block;width:100%;max-width:520px;height:auto;border-radius:16px 16px 0 0;" />`
    : "";
  const preheader = escapeHtml(text.split(/\n/)[0]?.trim().slice(0, 140) || input.heading);

  return `<!DOCTYPE html>
<html>
<body style="margin:0;background:#f6f7fb;color:#1c1c1c;font-family:Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f6f7fb;padding:28px 12px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px;border:1px solid #e6e8ef;">
        ${banner ? `<tr><td>${banner}</td></tr>` : ""}
        <tr><td style="padding:28px;">
          <p style="margin:0 0 8px;color:#5b21b6;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;">${escapeHtml(SITE_NAME)}</p>
          <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#111111;">${escapeHtml(input.heading)}</h1>
          ${paragraphs}
          <p style="margin:22px 0;">
            <a href="${escapeHtml(href)}" style="display:inline-block;background:#111111;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:8px;">${escapeHtml(input.ctaLabel || "Play now")}</a>
          </p>
          <p style="margin:18px 0 0;color:#666666;font-size:12px;line-height:1.5;">You are receiving this because you have a Casinova Gaming account. Play responsibly. 18+.<br><a href="${escapeHtml(SITE_URL)}" style="color:#666666;">${escapeHtml(SITE_URL)}</a></p>
          <p style="margin:12px 0 0;font-size:12px;line-height:1.4;"><a href="${escapeHtml(input.unsubscribeHref)}" style="color:#666666;">Unsubscribe</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendPromoEmail(input: {
  to: string;
  subject: string;
  heading: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
}): Promise<{ ok: true } | { ok: false; error: string; quota: boolean }> {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) {
    return {
      ok: false,
      quota: false,
      error: "Add RESEND_API_KEY in the site settings. Create a free key at resend.com, verify casinovasgaming.com, then paste the key.",
    };
  }

  const unsubscribeHref = unsubscribeUrl(input.to);
  const message = { ...input, unsubscribeHref };
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: resendFromAddress(),
      to: [input.to],
      subject: inboxSubject(input.subject) || input.subject,
      html: promoEmailHtml(message),
      text: promoEmailText(message),
      headers: {
        "List-Unsubscribe": `<${unsubscribeHref}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    }),
  });

  if (res.ok) return { ok: true };

  const text = await res.text().catch(() => "");
  const quota = res.status === 429 || /daily_quota|monthly_quota|quota/i.test(text);
  let error = `Resend rejected the email (${res.status}).`;
  try {
    const json = JSON.parse(text) as { message?: string };
    if (json.message) error = json.message;
  } catch {
    if (text.trim()) error = text.trim().slice(0, 240);
  }
  return { ok: false, quota, error };
}

export { FREE_DAILY_CAP };
