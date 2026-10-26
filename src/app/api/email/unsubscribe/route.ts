import { emailFromUnsubscribeToken, recordEmailOptOut } from "@/lib/email/unsubscribe";

async function finish(request: Request): Promise<Response> {
  const token = new URL(request.url).searchParams.get("token")?.trim() ?? "";
  const email = emailFromUnsubscribeToken(token);
  if (!email) {
    return new Response("This unsubscribe link is not valid.", {
      status: 400,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }
  await recordEmailOptOut(email);
  if (request.method === "POST") return new Response(null, { status: 200 });
  const html = `<!DOCTYPE html>
<html>
<body style="margin:0;background:#0b0b16;color:#f4f4f8;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0b0b16;padding:48px 16px;">
    <tr><td align="center">
      <table style="max-width:480px;">
        <tr><td>
          <h1 style="font-size:22px;">You are unsubscribed</h1>
          <p style="line-height:1.5;color:#c8c8d4;">Casinova will not send more promo emails to this address. Account mail, like a password reset, is separate.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
}

export function GET(request: Request) {
  return finish(request);
}

export function POST(request: Request) {
  return finish(request);
}
