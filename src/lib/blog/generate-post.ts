import "server-only";

export type GeneratedBlogDraft = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  seo_title: string;
  seo_description: string;
  image_prompt: string;
};

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
}

function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced?.[1]) {
      return JSON.parse(fenced[1].trim());
    }
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error("Model did not return valid JSON.");
  }
}

function normalizeDraft(raw: unknown, topic: string): GeneratedBlogDraft {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid draft payload from AI.");
  }
  const obj = raw as Record<string, unknown>;
  const title = String(obj.title ?? "").trim();
  const excerpt = String(obj.excerpt ?? "").trim();
  const content = String(obj.content ?? "").trim();
  const seo_title = String(obj.seo_title ?? title).trim().slice(0, 120);
  const seo_description = String(obj.seo_description ?? excerpt)
    .trim()
    .slice(0, 300);
  const image_prompt = String(obj.image_prompt ?? "").trim();
  const slugRaw = String(obj.slug ?? title).trim();

  if (title.length < 3) throw new Error("Generated title was too short.");
  if (content.length < 40) throw new Error("Generated content was too short.");

  return {
    title: title.slice(0, 200),
    slug: slugify(slugRaw || topic) || `post-${Date.now()}`,
    excerpt: excerpt.slice(0, 500),
    content: content.slice(0, 50000),
    seo_title: seo_title || title.slice(0, 120),
    seo_description: seo_description || excerpt.slice(0, 300),
    image_prompt:
      image_prompt ||
      `Cinematic gaming atmosphere cover art for: ${title}, dark neon casino desk, no text, no logos`,
  };
}

/** Generate blog fields with Gemini free API. */
export async function generateBlogDraftWithGemini(topic: string): Promise<GeneratedBlogDraft> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not set. Get a free key at https://aistudio.google.com/apikey and add it to .env.local / Vercel."
    );
  }

  const model = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const prompt = `You are the content writer for Casinova Gaming (casinovasgaming.com), a premium gaming support desk for platforms like Juwa, Game Vault, Vegas Sweeps, and similar agent desks.

Write ONE helpful blog post about this topic:
"${topic.trim()}"

Rules:
- Educational / how-to / tips tone. Do NOT invent bonuses, odds, payouts, or guarantees.
- Do NOT encourage illegal gambling or underage play. Audience is adults 18+.
- Brand name is Casinova (not Spinora).
- content must be HTML using <p>, <h2>, <h3>, <ul>, <ol>, <li>, <strong> only. No <script> or inline styles.
- Keep it useful for players using an online gaming desk / wallet / VIP style portal.
- image_prompt: short English visual prompt for a cover image (no text overlay, no brand logos, cinematic gaming mood).

Return ONLY valid JSON with keys:
title, slug, excerpt, content, seo_title, seo_description, image_prompt
slug must be lowercase letters, numbers, hyphens only.`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        responseMimeType: "application/json",
      },
    }),
    signal: AbortSignal.timeout(90_000),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    if (res.status === 429) {
      throw new Error("Gemini free quota hit. Wait a bit and try again.");
    }
    if (res.status === 400 || res.status === 403) {
      throw new Error(
        `Gemini rejected the request (${res.status}). Check GEMINI_API_KEY / model. ${errText.slice(0, 200)}`
      );
    }
    throw new Error(`Gemini failed (${res.status}): ${errText.slice(0, 240)}`);
  }

  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  if (!text.trim()) throw new Error("Gemini returned empty content.");

  return normalizeDraft(extractJsonObject(text), topic);
}

/** Free cover image via Pollinations; optionally persist to Supabase cms-media. */
export async function buildCoverImageUrl(params: {
  imagePrompt: string;
  slug: string;
  upload?: (path: string, bytes: Uint8Array, contentType: string) => Promise<string | null>;
}): Promise<string> {
  const prompt = params.imagePrompt.slice(0, 400);
  const remote = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1200&height=630&nologo=true&seed=${Date.now()}`;

  if (!params.upload) return remote;

  try {
    const imgRes = await fetch(remote, {
      signal: AbortSignal.timeout(90_000),
      headers: { Accept: "image/*" },
    });
    if (!imgRes.ok) return remote;
    const bytes = new Uint8Array(await imgRes.arrayBuffer());
    if (bytes.byteLength < 1000) return remote;
    const contentType = imgRes.headers.get("content-type")?.startsWith("image/")
      ? imgRes.headers.get("content-type")!
      : "image/jpeg";
    const ext = contentType.includes("png") ? "png" : "jpg";
    const path = `blog/${params.slug}-${Date.now()}.${ext}`;
    const publicUrl = await params.upload(path, bytes, contentType);
    return publicUrl || remote;
  } catch {
    return remote;
  }
}

export function uniqueSlug(base: string, existing: Set<string>): string {
  let slug = slugify(base) || `post-${Date.now()}`;
  if (!existing.has(slug)) return slug;
  for (let i = 2; i < 50; i++) {
    const candidate = `${slug.slice(0, 60)}-${i}`;
    if (!existing.has(candidate)) return candidate;
  }
  return `${slug.slice(0, 50)}-${Date.now().toString(36)}`;
}
