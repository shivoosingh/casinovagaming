// Build a self-contained before/after review page for the phase 2 rewrites.
// Reads only local files; never touches the database.
//
//   node scripts/build-blog-review.mjs <published-export.json>
//
// <published-export.json> is an export of the currently published posts
// (array, or a Supabase CLI export with a "rows" array). Output:
// docs/seo/phase2-article-review.html
import fs from "node:fs";
import path from "node:path";

const DIR = "supabase/blog-phase2";
const OUT = "docs/seo/phase2-article-review.html";
const FACTCHECK = path.join(DIR, "factcheck.json");

const basePath = process.argv[2];
if (!basePath) {
  console.error("usage: node scripts/build-blog-review.mjs <published-export.json>");
  process.exit(2);
}
const parsed = JSON.parse(fs.readFileSync(basePath, "utf8"));
const before = new Map((Array.isArray(parsed) ? parsed : parsed.rows).map((row) => [row.slug, row]));
const rewrites = fs
  .readdirSync(DIR)
  .filter((f) => /^batch-\d+\.json$/.test(f))
  .sort()
  .flatMap((f) => JSON.parse(fs.readFileSync(path.join(DIR, f), "utf8")));
const factcheck = fs.existsSync(FACTCHECK) ? JSON.parse(fs.readFileSync(FACTCHECK, "utf8")) : {};

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const words = (s) => String(s ?? "").replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
// The rewrite is our own reviewed HTML, but strip anything executable before rendering it in a review page.
const safeHtml = (s) => String(s ?? "").replace(/<script[\s\S]*?<\/script>/gi, "").replace(/\son\w+="[^"]*"/gi, "");
const list = (items) => (items?.length ? `<ul>${items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>` : "<p class=\"muted\">None.</p>");

const VERDICT_LABEL = {
  ready: "Fact-checked: ready",
  corrected: "Fact-checked: corrected",
  owner: "Needs your answer first",
};

const sections = rewrites.map((post, index) => {
  const old = before.get(post.slug) ?? {};
  const fc = factcheck[post.slug] ?? {};
  const metaRow = (label, a, b) => `<tr><th>${label}</th><td>${esc(a)}</td><td>${esc(b)}</td></tr>`;
  return `
<section id="${esc(post.slug)}">
  <h2><span class="n">${index + 1}</span> ${esc(post.title)}</h2>
  <p class="slug">/blog/${esc(post.slug)} ${fc.verdict ? `<span class="badge ${esc(fc.verdict)}">${esc(VERDICT_LABEL[fc.verdict] ?? fc.verdict)}</span>` : ""}</p>
  <table class="meta">
    <thead><tr><th></th><th>Before (live now)</th><th>After (proposed)</th></tr></thead>
    <tbody>
      ${metaRow("Title", old.title, post.title)}
      ${metaRow("Search title", old.seo_title, `${post.seo_title} | Casinova Gaming`)}
      ${metaRow("Search description", old.seo_description, post.seo_description)}
      ${metaRow("Summary", old.excerpt, post.excerpt)}
      ${metaRow("Tags", (old.tags ?? []).join(", "), (post.tags ?? []).join(", "))}
      ${metaRow("Length", `${words(old.content)} words`, `${words(post.content)} words`)}
    </tbody>
  </table>
  <div class="notes">
    <div><h3>Corrections made after fact-check</h3>${list(fc.corrections)}</div>
    <div><h3>Statements the code cannot confirm</h3>${list(fc.unverifiable)}</div>
    <div><h3>Questions for you</h3>${list(post.needs_review)}</div>
  </div>
  <div class="cols">
    <div><h3>Before (live now, as stored)</h3><pre>${esc(old.content ?? "(no post found)")}</pre></div>
    <div><h3>After (proposed, rendered)</h3><div class="after">${safeHtml(post.content)}</div></div>
  </div>
</section>`;
});

const toc = rewrites
  .map((post, index) => {
    const fc = factcheck[post.slug] ?? {};
    return `<li><a href="#${esc(post.slug)}">${index + 1}. ${esc(post.title)}</a>${fc.verdict ? ` <span class="badge ${esc(fc.verdict)}">${esc(VERDICT_LABEL[fc.verdict] ?? fc.verdict)}</span>` : ""}</li>`;
  })
  .join("");

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Blog rewrite review</title>
<style>
  :root { --bg:#f7f7f9; --card:#fff; --ink:#1b1c22; --muted:#666a78; --line:#dcdde3; --accent:#5b3fd6; --ok:#12733f; --warn:#8a5a00; --stop:#a3231d; }
  @media (prefers-color-scheme: dark) { :root { --bg:#101116; --card:#181a21; --ink:#e9eaf0; --muted:#9a9eae; --line:#2c2f3a; --accent:#a996ff; --ok:#5fd39a; --warn:#f0bd5a; --stop:#ff8a82; } }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--ink); font:16px/1.55 system-ui, -apple-system, "Segoe UI", sans-serif; }
  header, section, nav { max-width:1280px; margin:0 auto; padding:16px; }
  h1 { font-size:1.6rem; margin:16px 0 4px; }
  h2 { font-size:1.25rem; margin:0 0 4px; }
  h3 { font-size:.8rem; text-transform:uppercase; letter-spacing:.06em; color:var(--muted); margin:0 0 8px; }
  .muted, .slug { color:var(--muted); }
  .slug { font-family:ui-monospace, Consolas, monospace; font-size:.85rem; margin:0 0 12px; overflow-wrap:anywhere; }
  .n { display:inline-block; min-width:1.8em; color:var(--accent); }
  nav ol { columns:2 320px; padding-left:1.2em; }
  a { color:var(--accent); }
  section { background:var(--card); border:1px solid var(--line); border-radius:12px; margin:16px auto; }
  table.meta { width:100%; border-collapse:collapse; font-size:.9rem; table-layout:fixed; }
  table.meta th, table.meta td { border:1px solid var(--line); padding:6px 8px; text-align:left; vertical-align:top; overflow-wrap:anywhere; }
  table.meta th:first-child { width:9.5em; color:var(--muted); font-weight:600; }
  .notes { display:grid; grid-template-columns:repeat(auto-fit, minmax(260px, 1fr)); gap:12px; margin:14px 0; font-size:.9rem; }
  .notes > div { border:1px solid var(--line); border-radius:8px; padding:10px 12px; }
  .notes ul { margin:0; padding-left:1.1em; }
  .cols { display:grid; grid-template-columns:repeat(auto-fit, minmax(320px, 1fr)); gap:12px; }
  .cols > div { border:1px solid var(--line); border-radius:8px; padding:12px; min-width:0; }
  pre { white-space:pre-wrap; overflow-wrap:anywhere; font:13px/1.5 ui-monospace, Consolas, monospace; margin:0; }
  .after table { border-collapse:collapse; display:block; overflow-x:auto; }
  .after th, .after td { border:1px solid var(--line); padding:4px 8px; text-align:left; }
  .after h2 { font-size:1.1rem; margin:1.2em 0 .4em; } .after h3 { font-size:1rem; text-transform:none; letter-spacing:0; color:var(--ink); margin:1em 0 .3em; }
  .badge { display:inline-block; font:600 .72rem/1.6 system-ui, sans-serif; padding:0 8px; border-radius:999px; border:1px solid currentColor; vertical-align:middle; }
  .badge.ready { color:var(--ok); } .badge.corrected { color:var(--warn); } .badge.owner { color:var(--stop); }
</style>
</head>
<body>
<header>
  <h1>Blog rewrite review: ${rewrites.length} posts</h1>
  <p class="muted">Nothing on this page is live. "Before" is the post as stored in the database today; "After" is the proposed rewrite. Applying it needs your approval.</p>
</header>
<nav><ol style="list-style:none;padding-left:0">${toc}</ol></nav>
${sections.join("\n")}
</body>
</html>
`;
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, html);
console.log(`${OUT}: ${rewrites.length} posts, ${(html.length / 1024) | 0} KB`);
