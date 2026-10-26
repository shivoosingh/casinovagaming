import "server-only";

export type GeneratedPromo = {
  name: string;
  subject: string;
  heading: string;
  body: string;
  cta_label: string;
  cta_href: string;
};

function extractJson(text: string): Record<string, unknown> {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1)) as Record<string, unknown>;
    throw new Error("Promo generator did not return usable text.");
  }
}

/** One short Casinova promotion the admin can email as-is. */
export async function generatePromoCopy(): Promise<GeneratedPromo> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set, so a promo cannot be written automatically.");

  const model = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
  const prompt = `Write one short email promotion for Casinova Gaming (https://casinovasgaming.com).

Make it an event or offer, like Black Friday, payday, a weekend deposit, or a welcome-back. Do not center the email on one game.

Real offer only, do not invent others:
- First deposit loaded into a game gets a 100% bonus. Example: $5 deposit loads $10 in the game.
- Second deposit gets a 50% bonus. Example: $5 loads $7.50.
- Third deposit and later load the same amount, no bonus.
- A $4.99 deposit counts as $5.
- The bonus is on the site, then the player loads it into any game.
- Audience is adults 18+. Say play responsibly in the body.
- Brand name is Casinova, never Spinora.
- Friendly, short, no ALL CAPS spam words, no fake urgency like "last chance" or "guaranteed win".

Return ONLY JSON with keys:
name (internal label, under 60 chars),
subject (email subject, under 70 chars),
heading (under 80 chars),
body (2 or 3 short sentences, plain text, no HTML),
cta_label (2 or 3 words, like "Play now"),
cta_href (use "/")
`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.8, responseMimeType: "application/json" },
      }),
      signal: AbortSignal.timeout(40_000),
    }
  );

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Could not write the promo (${res.status}). ${errText.slice(0, 180)}`);
  }

  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
  const json = extractJson(text);
  const subject = String(json.subject ?? "").trim().slice(0, 200);
  const heading = String(json.heading ?? "").trim().slice(0, 200);
  const body = String(json.body ?? "").trim().slice(0, 2000);
  if (!subject || !heading || !body) throw new Error("The promo came back incomplete. Try Generate again.");

  const day = new Date().toISOString().slice(0, 10);
  const banners = [
    "/email/black-friday.png",
    "/email/cyber-monday.png",
    "/email/weekend.png",
    "/email/payday.png",
    "/email/welcome-back.png",
    "/email/new-player.png",
    "/email/second-bonus.png",
    "/email/midnight.png",
    "/email/vip.png",
    "/email/holiday.png",
  ];
  const banner = banners[new Date().getDate() % banners.length];
  return {
    name: String(json.name ?? `Promo ${day}`).trim().slice(0, 160) || `Promo ${day}`,
    subject,
    heading,
    body: body.startsWith("{{image:") ? body : `{{image:${banner}}}\n${body}`,
    cta_label: String(json.cta_label ?? "Deposit now").trim().slice(0, 60) || "Deposit now",
    cta_href: "/dashboard/deposit",
  };
}
