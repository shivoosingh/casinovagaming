// Rollback helper: turn a blog_posts export into SQL that puts those rows back
// exactly as they were (text, metadata, tags and status). Prints SQL to stdout;
// it never connects to the database.
//
//   node scripts/build-blog-restore-sql.mjs <export.json> [slug,slug,...] > restore.sql
//
// <export.json> is an array of rows or a Supabase CLI export with a "rows" array,
// containing at least: slug, title, excerpt, content, seo_title, seo_description, tags, status.
// With no slug list, every row in the export is restored.
import fs from "node:fs";

const [file, only] = process.argv.slice(2);
if (!file) {
  console.error("usage: node scripts/build-blog-restore-sql.mjs <export.json> [slug,slug,...]");
  process.exit(2);
}
const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
const rows = Array.isArray(parsed) ? parsed : parsed.rows;
const wanted = only ? new Set(only.split(",")) : null;

function quote(text) {
  let tag = "r";
  while (String(text).includes(`$${tag}$`)) tag += "x";
  return `$${tag}$${text}$${tag}$`;
}
const value = (v) => (v === null || v === undefined ? "NULL" : quote(String(v)));
const tags = (v) => (Array.isArray(v) && v.length ? `ARRAY[${v.map((t) => quote(String(t))).join(", ")}]::text[]` : "'{}'::text[]");

const out = ["BEGIN;", ""];
let count = 0;
for (const row of rows) {
  if (wanted && !wanted.has(row.slug)) continue;
  if (!/^[a-z0-9-]+$/.test(row.slug)) throw new Error(`unsafe slug: ${row.slug}`);
  if (!row.status) throw new Error(`${row.slug}: export has no status column; re-export with status`);
  out.push(
    "UPDATE public.blog_posts SET",
    `  title = ${value(row.title)},`,
    `  excerpt = ${value(row.excerpt)},`,
    `  content = ${value(row.content)},`,
    `  seo_title = ${value(row.seo_title)},`,
    `  seo_description = ${value(row.seo_description)},`,
    `  tags = ${tags(row.tags)},`,
    `  status = ${value(row.status)}`,
    `WHERE slug = '${row.slug}';`,
    ""
  );
  count++;
}
out.push("COMMIT;", "");
process.stdout.write(out.join("\n"));
console.error(`restore SQL for ${count} posts`);
