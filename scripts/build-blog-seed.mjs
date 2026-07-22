/**
 * One-shot generator: rebuild final-file-blog-seed-casinova.sql from final-file
 * sources with casinovasgaming branding + cover images.
 *
 * Run: node scripts/build-blog-seed.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const REF = path.resolve(ROOT, "..", "_final_file_ref");

function brand(text) {
  if (text == null) return text;
  return String(text)
    .replace(/Win\s*Sweeps/gi, "casinovasgaming")
    .replace(/WinSweeps/gi, "casinovasgaming")
    .replace(/Spinora/g, "casinovasgaming")
    .replace(/spinora/gi, "casinovasgaming")
    .replace(/spinoracasinos\.com/gi, "casinovasgaming.com")
    .replace(/casinovacasinos\.com/gi, "casinovasgaming.com");
}

function brandSlug(slug) {
  return brand(slug).toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-");
}

const LOCAL_GAME_POSTERS = [
  "/games/fire-kirin.webp",
  "/games/orion-stars.webp",
  "/games/juwa.webp",
  "/games/game-vault.webp",
  "/games/panda-master.webp",
  "/games/milky-way.webp",
  "/games/vegas-sweeps.webp",
  "/games/ultrapanda.webp",
  "/games/gameroom.webp",
  "/games/mafia.webp",
  "/games/cash-machine.webp",
  "/games/cash-frenzy.webp",
  "/games/mr-all-in-one.webp",
  "/games/buffalo-link.webp",
  "/games/ocean-king.webp",
  "/games/ace-book.webp",
  "/games/blue-dragon.webp",
  "/games/dragon-master.webp",
  "/games/fish-hunter.webp",
  "/games/galaxy-games.webp",
  "/games/golden-dragon.webp",
  "/games/high-stakes.webp",
  "/games/lucky-lion.webp",
  "/games/lucky-slots.webp",
  "/games/mega-spin.webp",
  "/games/monster-hunter.webp",
  "/games/moolah.webp",
  "/games/pharaohs-treasure.webp",
  "/games/river-sweeps.webp",
  "/games/vb-game.webp",
  "/games/vblink.webp",
];

const GAME_COVERS = {
  "orion-stars": "/games/orion-stars.webp",
  "game-vault": "/games/game-vault.webp",
  juwa: "/games/juwa.webp",
  "fire-kirin": "/games/fire-kirin.webp",
  "mr-all-in-one": "/games/mr-all-in-one.webp",
  "cash-machine": "/games/cash-machine.webp",
  "cash-frenzy": "/games/cash-frenzy.webp",
  "panda-master": "/games/panda-master.webp",
  vblink: "/games/vblink.webp",
  "milky-way": "/games/milky-way.webp",
  "vegas-sweeps": "/games/vegas-sweeps.webp",
  ultrapanda: "/games/ultrapanda.webp",
  gameroom: "/games/gameroom.webp",
  mafia: "/games/mafia.webp",
  buffalo: "/games/buffalo-link.webp",
  "ocean-king": "/games/ocean-king.webp",
};

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function resolveCover(slug, url) {
  if (
    url &&
    (url.startsWith("/images/") ||
      url.startsWith("/games/") ||
      (url.startsWith("http") && !url.includes("pexels.com") && !url.includes("unsplash.com")))
  ) {
    return url;
  }
  // Prefer the curated pexels URL from FALLBACK when present (same images final-file lists)
  if (url && (url.includes("pexels.com") || url.includes("unsplash.com"))) {
    return url;
  }
  const s = slug.toLowerCase();
  for (const [key, imagePath] of Object.entries(GAME_COVERS)) {
    if (s.includes(key) || s.replace(/-/g, "").includes(key.replace(/-/g, ""))) {
      return imagePath;
    }
  }
  return LOCAL_GAME_POSTERS[hashString(slug) % LOCAL_GAME_POSTERS.length];
}

function sqlString(s) {
  return "'" + String(s).replace(/'/g, "''") + "'";
}

function sqlDollar(s) {
  // Use $t$ ... $t$ for markdown bodies
  if (s.includes("$t$")) {
    return "$body$" + s + "$body$";
  }
  return "$t$" + s + "$t$";
}

function sqlArray(tags) {
  if (!tags?.length) return "'{}'";
  return (
    "ARRAY[" +
    tags.map((t) => sqlString(brand(t))).join(", ") +
    "]::text[]"
  );
}

/** Parse FALLBACK_BLOG_POSTS from marketing.ts for cover/title/excerpt map */
function parseFallbackCovers(marketingSrc) {
  const map = new Map();
  const re =
    /\{\s*id:\s*"p\d+",\s*slug:\s*"([^"]+)",\s*title:\s*"((?:\\.|[^"\\])*)",\s*excerpt:\s*"((?:\\.|[^"\\])*)",\s*cover_image_url:\s*"([^"]+)"/g;
  let m;
  while ((m = re.exec(marketingSrc))) {
    const slug = m[1];
    map.set(slug, {
      slug,
      title: m[2].replace(/\\"/g, '"'),
      excerpt: m[3].replace(/\\"/g, '"'),
      cover: m[4],
    });
  }
  return map;
}

/**
 * Extract insert rows from SQL seed files.
 * Handles: ('slug', 'title', 'excerpt', E'...', array[...], true, ..., 'seo', 'desc')
 * and dollar-quoted content $t$...$t$
 */
function unquoteSql(s) {
  return String(s).replace(/''/g, "'");
}

function extractPostsFromSql(sql) {
  const posts = [];
  // Find each slug-led row; content may be E'...' (with '' escapes) or $t$...$t$
  // Optional cover_image_url between content and tags.
  const rowRe =
    /\(\s*'([a-z0-9][a-z0-9-]*)'\s*,\s*'((?:''|[^'])*)'\s*,\s*'((?:''|[^'])*)'\s*,\s*(?:E'((?:''|\\'|[^'])*)'|\$t\$([\s\S]*?)\$t\$)\s*,\s*(?:'((?:''|[^'])*)'\s*,\s*)?(?:array\[([\s\S]*?)\]|ARRAY\[([\s\S]*?)\])\s*,\s*(?:'[a-z_]+'\s*,\s*)?(?:true|false)\s*,\s*([^,]+?(?:'[^']*'[^,]*)?)\s*,\s*'((?:''|[^'])*)'\s*,\s*'((?:''|[^'])*)'\s*\)/gi;

  let m;
  while ((m = rowRe.exec(sql))) {
    const slug = m[1];
    const title = unquoteSql(m[2]);
    const excerpt = unquoteSql(m[3]);
    let content = m[4] ?? m[5] ?? "";
    if (m[4]) {
      content = unquoteSql(content)
        .replace(/\\n/g, "\n")
        .replace(/\\'/g, "'")
        .replace(/\\\\/g, "\\");
    }
    const coverFromSql = m[6] ? unquoteSql(m[6]) : null;
    const tagRaw = m[7] ?? m[8] ?? "";
    const tags = [...tagRaw.matchAll(/'((?:''|[^'])*)'/g)].map((x) => unquoteSql(x[1]));
    const published = m[9].trim();
    const seoTitle = unquoteSql(m[10]);
    const seoDesc = unquoteSql(m[11]);
    posts.push({
      slug,
      title,
      excerpt,
      content,
      tags,
      published,
      seoTitle,
      seoDesc,
      coverFromSql,
    });
  }
  return posts;
}

function main() {
  const marketingPath = path.join(REF, "src/lib/data/marketing.ts");
  const marketingSrc = fs.readFileSync(marketingPath, "utf8");
  const fallback = parseFallbackCovers(marketingSrc);
  console.log("fallback covers:", fallback.size);

  const seedFiles = [
    "20260614000021_blog_seed.sql",
    "20260616000050_blog_posts_extra.sql",
    "20260630000094_blog_how_to_win_seed.sql",
    "20260708000097_blog_posts_batch2.sql",
    "20260713000109_blog_next_gen_gaming_platform.sql",
  ];

  const bySlug = new Map();

  for (const name of seedFiles) {
    const sql = fs.readFileSync(path.join(REF, "supabase/migrations", name), "utf8");
    const rows = extractPostsFromSql(sql);
    console.log(name, "parsed", rows.length);
    for (const row of rows) {
      bySlug.set(row.slug, row);
    }
  }

  // Merge fallback metadata (covers) onto content posts; also keep fallback-only cards with excerpt as content
  const allSlugs = new Set([...bySlug.keys(), ...fallback.keys()]);
  console.log("unique slugs:", allSlugs.size);

  const lines = [];
  lines.push("-- CasinovasGaming blog seed — content + covers from final-file");
  lines.push("-- Spinora / Win Sweeps → casinovasgaming");
  lines.push("-- Idempotent via ON CONFLICT (slug) DO UPDATE");
  lines.push("-- Run in Supabase SQL Editor");
  lines.push("");
  lines.push("BEGIN;");
  lines.push("");

  let n = 0;
  for (const rawSlug of [...allSlugs].sort()) {
    const contentRow = bySlug.get(rawSlug);
    const meta = fallback.get(rawSlug);
    const slug = brandSlug(rawSlug);
    if (!/^[a-z0-9-]+$/.test(slug)) {
      console.warn("skip bad slug", rawSlug, "→", slug);
      continue;
    }

    const title = brand(contentRow?.title ?? meta?.title ?? rawSlug);
    const excerpt = brand(contentRow?.excerpt ?? meta?.excerpt ?? "");
    const content = brand(
      contentRow?.content ??
        meta?.excerpt ??
        `${title}\n\nRead more guides at casinovasgaming.`
    );
    const tags = (contentRow?.tags ?? []).map(brand);
    const cover = resolveCover(slug, contentRow?.coverFromSql ?? meta?.cover ?? null);
    const seoTitle = brand(contentRow?.seoTitle ?? `${title} | casinovasgaming`);
    const seoDesc = brand(contentRow?.seoDesc ?? excerpt);
    const published = contentRow?.published?.includes("now")
      ? `now() - interval '${n} hours'`
      : contentRow?.published && contentRow.published.includes("timestamptz")
        ? contentRow.published
        : `now() - interval '${n} hours'`;

    lines.push(`INSERT INTO public.blog_posts (`);
    lines.push(
      `  slug, title, excerpt, content, cover_image_url, tags, status, is_published, published_at, seo_title, seo_description`
    );
    lines.push(`) VALUES (`);
    lines.push(`  ${sqlString(slug)},`);
    lines.push(`  ${sqlString(title)},`);
    lines.push(`  ${sqlString(excerpt)},`);
    lines.push(`  ${sqlDollar(content)},`);
    lines.push(`  ${sqlString(cover)},`);
    lines.push(`  ${sqlArray(tags)},`);
    lines.push(`  'published',`);
    lines.push(`  true,`);
    lines.push(`  ${published},`);
    lines.push(`  ${sqlString(seoTitle)},`);
    lines.push(`  ${sqlString(seoDesc)}`);
    lines.push(`)`);
    lines.push(`ON CONFLICT (slug) DO UPDATE SET`);
    lines.push(`  title = EXCLUDED.title,`);
    lines.push(`  excerpt = EXCLUDED.excerpt,`);
    lines.push(`  content = EXCLUDED.content,`);
    lines.push(`  cover_image_url = EXCLUDED.cover_image_url,`);
    lines.push(`  tags = EXCLUDED.tags,`);
    lines.push(`  status = 'published',`);
    lines.push(`  is_published = true,`);
    lines.push(`  published_at = COALESCE(public.blog_posts.published_at, EXCLUDED.published_at),`);
    lines.push(`  seo_title = EXCLUDED.seo_title,`);
    lines.push(`  seo_description = EXCLUDED.seo_description;`);
    lines.push("");
    n++;
  }

  lines.push("COMMIT;");
  lines.push("");

  const out = path.join(ROOT, "supabase/final-file-blog-seed-casinova.sql");
  fs.writeFileSync(out, lines.join("\n"), "utf8");
  console.log("wrote", out, "posts:", n, "bytes:", fs.statSync(out).size);

  // Sanity: no Spinora, no uppercase in first slug of each insert
  const outText = fs.readFileSync(out, "utf8");
  console.log("Spinora leftovers:", (outText.match(/Spinora|spinora(?!sgaming)/gi) || []).length);
  const badSlugs = [...outText.matchAll(/INSERT INTO public\.blog_posts[\s\S]*?VALUES \(\s*'([^']+)'/g)]
    .map((x) => x[1])
    .filter((s) => /[A-Z]/.test(s) || !/^[a-z0-9-]+$/.test(s));
  console.log("bad slugs:", badSlugs);
}

main();
