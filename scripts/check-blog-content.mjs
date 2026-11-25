// Quality gate for published blog posts. Reads the live Supabase table and fails
// (exit 1) on anything that would make a post dishonest, thin or broken:
//   - coming-soon games presented as playable, or links to their game pages
//   - invented numbers (RTP, "secret payout", "N-minute cashout", free credits, guarantees)
//   - payment methods that are not offered
//   - markdown syntax inside an HTML body, missing FAQ, too few internal links
//   - links to retired or unknown blog slugs
//   - em/en dashes (house style), thin bodies
// Usage: node scripts/check-blog-content.mjs            (reads .env.local)
//        node scripts/check-blog-content.mjs --warn-only
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  const raw = fs.readFileSync(".env.local", "utf8");
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    env[m[1].trim()] = v;
  }
  return env;
}

const warnOnly = process.argv.includes("--warn-only");
// Offline mode: --offline base.json [override.json ...]. Each file is an array of
// posts (or a Supabase CLI export with a "rows" array). Later files override earlier
// ones by slug, so a batch of rewrites can be linted against the published set
// without touching the database.
const offlineAt = process.argv.indexOf("--offline");
const onlyAt = process.argv.indexOf("--only");
const offlineFiles =
  offlineAt === -1
    ? []
    : process.argv.slice(offlineAt + 1).filter((a, i) => !a.startsWith("--") && offlineAt + 1 + i !== onlyAt + 1);
const onlySlugs = onlyAt === -1 ? null : new Set(process.argv[onlyAt + 1].split(","));

// Keep these in step with src/lib/games.ts and src/lib/seo/retired-posts.ts.
const LIVE = ["game-vault", "juwa", "mr-all-in-one", "cash-machine", "cash-frenzy", "vegas-sweeps", "gameroom", "mafia"];
const UPCOMING = { "orion-stars": "Orion Stars", "fire-kirin": "Fire Kirin", "panda-master": "Panda Master", vblink: "Vblink", "milky-way": "Milky Way", ultrapanda: "Ultrapanda" };
const retiredSrc = fs.readFileSync("src/lib/seo/retired-posts.ts", "utf8");
const RETIRED = new Set([...retiredSrc.matchAll(/^\s*"([a-z0-9-]+)":/gm)].map((m) => m[1]));

const BANNED = [
  [/\b\d+(\.\d+)?\s*%\s*RTP\b/i, "RTP percentage"],
  [/\bRTP of \d/i, "RTP figure"],
  [/secret payout|payout pattern/i, "payout pattern claim"],
  [/\b\d+[- ]minute (cash ?out|payout|withdrawal|redeem)/i, "payout-time promise"],
  [/instant (cash ?out|payout|withdrawal|redeem)/i, "instant payout claim"],
  [/\bguaranteed\b/i, "guarantee"],
  [/free credits? (code|trick|hack)|free credit tricks/i, "free credits bait"],
  [/\bpromo codes?\b(?! and bonus codes\.)(?!\s*\.)(?!.*\bnone\b)/i, "promo code mention"],
  [/legal in (all|every|your|texas|florida|california|georgia|new york|ohio|north carolina|illinois|pennsylvania|michigan|nevada|arizona)/i, "legality claim"],
  [/all 50 states/i, "all-50-states claim"],
  [/\bSpinora\b|\bWin ?Sweeps\b/i, "old brand name"],
  [/50% (first|welcome)[ -]deposit bonus/i, "wrong bonus number"],
];
// Methods the live checkout does NOT list. Card, Apple Pay, Google Pay, Cash App
// and Chime are offered (checked against the checkout on 2026-11-26).
const PAYMENTS = /\b(zelle|venmo|paypal|bitcoin|usdt|crypto)\b/i;
const NEGATION_NEAR = /\b(not|no|never|do not|does not|are not|is not|without|instead of|retired|not offered)\b/i;

function strip(html) {
  return html.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
}
function looksLikeHtml(s) {
  return /<(p|h[1-6]|ul|ol|div|blockquote|table)\b/i.test(s);
}
function extractFaqCount(html) {
  const m = html.match(/<h2[^>]*>\s*(faq|faqs|frequently asked questions)\s*<\/h2>/i);
  if (!m) {
    // markdown form
    const md = html.split(/^## FAQ\s*$/m)[1];
    if (!md) return 0;
    return (md.split(/^## /m)[0].match(/^\*\*(.+?)\*\*/gm) || []).length;
  }
  const after = html.slice(m.index + m[0].length);
  const section = after.split(/<h2[\s>]/i)[0];
  const h3 = (section.match(/<h3/gi) || []).length;
  if (h3) return h3;
  return (section.match(/<p[^>]*>\s*<strong>/gi) || []).length;
}

async function loadPosts() {
  if (offlineFiles.length) {
    const bySlug = new Map();
    for (const file of offlineFiles) {
      const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
      for (const row of Array.isArray(parsed) ? parsed : parsed.rows) bySlug.set(row.slug, row);
    }
    return [...bySlug.values()].sort((a, b) => a.slug.localeCompare(b.slug));
  }
  const env = loadEnv();
  const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const { data, error } = await admin
    .from("blog_posts")
    .select("slug,title,excerpt,content,seo_title,seo_description,status")
    .eq("status", "published")
    .order("slug")
    .limit(1000);
  if (error) {
    console.error("query failed:", error.message);
    process.exit(2);
  }
  return data;
}
const data = await loadPosts();
const published = new Set(data.map((r) => r.slug));
const findings = [];
const warn = (slug, msg) => findings.push(`${slug}: ${msg}`);

for (const row of data) {
  if (onlySlugs && !onlySlugs.has(row.slug)) continue;
  const body = row.content ?? "";
  const text = strip(body);
  const all = `${row.title}\n${row.excerpt ?? ""}\n${text}`;
  const isHtml = looksLikeHtml(body);

  if (body.trim().length < 600) warn(row.slug, `thin body (${body.trim().length} chars)`);
  if (body.trim() && row.excerpt && body.trim() === row.excerpt.trim()) warn(row.slug, "body equals excerpt");
  if (isHtml && /(^|\n)#{1,6} |\*\*[^*]+\*\*|\]\(\//.test(body.replace(/<[^>]+>/g, ""))) warn(row.slug, "markdown syntax inside HTML body");
  if (extractFaqCount(body) === 0) warn(row.slug, "no FAQ section");
  if (/[–—]/.test(all)) warn(row.slug, "em/en dash");
  if (/<script/i.test(body)) warn(row.slug, "script tag in body");

  const seoTitle = (row.seo_title ?? row.title ?? "").replace(/\s*\|\s*Casinova Gaming\s*$/i, "");
  if (seoTitle.length > 60) warn(row.slug, `seo title over 60 chars before brand suffix (${seoTitle.length})`);
  const seoDesc = row.seo_description ?? row.excerpt ?? "";
  if (seoDesc.length > 160) warn(row.slug, `meta description over 160 chars (${seoDesc.length})`);
  if (seoDesc.length < 70) warn(row.slug, `meta description under 70 chars (${seoDesc.length})`);
  if (/20(1\d|2[0-5])/.test(`${row.title} ${row.seo_title ?? ""}`)) warn(row.slug, "stale year in title");
  if (/â€|Ã./.test(all)) warn(row.slug, "mojibake (broken character encoding)");

  const links = [...body.matchAll(/(?:href="|\]\()(\/[^")\s]+)/g)].map((m) => m[1]);
  const gameLinks = links.filter((l) => l.startsWith("/games/")).map((l) => l.split("/")[2].split(/[?#]/)[0]);
  const blogLinks = links.filter((l) => l.startsWith("/blog/")).map((l) => l.split("/")[2].split(/[?#]/)[0]);
  const internal = links.filter((l) => l.startsWith("/games/") || l.startsWith("/blog/"));
  if (internal.length < 2) warn(row.slug, `only ${internal.length} internal links`);
  for (const g of gameLinks) if (UPCOMING[g]) warn(row.slug, `links to coming-soon game page /games/${g}`);
  for (const g of gameLinks) if (!LIVE.includes(g) && !UPCOMING[g]) warn(row.slug, `links to unknown game /games/${g}`);
  for (const b of blogLinks) {
    if (RETIRED.has(b)) warn(row.slug, `links to retired post /blog/${b}`);
    else if (!published.has(b)) warn(row.slug, `links to unpublished/unknown post /blog/${b}`);
  }

  for (const name of Object.values(UPCOMING)) {
    const re = new RegExp(`${name}[^.]{0,80}\\b(download|load (it|${name})|create (an? )?account|is live|play ${name} (now|today))`, "i");
    const m = all.match(re);
    if (m && !NEGATION_NEAR.test(m[0]) && !/coming soon/i.test(all.slice(Math.max(0, m.index - 200), m.index + 200))) {
      warn(row.slug, `coming-soon game presented as playable: ${name}`);
    }
  }
  for (const [re, label] of BANNED) {
    const m = all.match(re);
    if (m) {
      const ctx = all.slice(Math.max(0, m.index - 80), m.index + m[0].length + 40);
      if (label === "promo code mention" && NEGATION_NEAR.test(ctx)) continue;
      warn(row.slug, `${label}: "${m[0]}"`);
    }
  }
  const pays = [...all.matchAll(new RegExp(PAYMENTS.source, "gi"))];
  for (const m of pays) {
    const ctx = all.slice(Math.max(0, m.index - 120), m.index + 60);
    if (!NEGATION_NEAR.test(ctx)) warn(row.slug, `names a payment method not offered without negation: "${m[0]}"`);
  }
}

console.log(`checked ${data.length} published posts; ${findings.length} findings`);
for (const f of findings) console.log(" -", f);
process.exit(findings.length && !warnOnly ? 1 : 0);
