import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  const raw = fs.readFileSync(".env.local", "utf8");
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    env[m[1].trim()] = v;
  }
  return env;
}

const env = loadEnv();
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// Check columns
const { data: one } = await admin.from("blog_posts").select("*").limit(1).maybeSingle();
console.log("columns:", one ? Object.keys(one) : "none");

const patch = { is_published: true, published_at: new Date().toISOString() };
if (one && Object.prototype.hasOwnProperty.call(one, "status")) {
  patch.status = "published";
}

const { data, error } = await admin
  .from("blog_posts")
  .update(patch)
  .eq("is_published", false)
  .select("slug");

console.log("published rows:", data?.length ?? 0, "err:", error?.message ?? null);

const { count } = await admin
  .from("blog_posts")
  .select("*", { count: "exact", head: true })
  .eq("is_published", true);
console.log("total published now:", count);
