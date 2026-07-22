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
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = env.SUPABASE_SERVICE_ROLE_KEY;

const admin = createClient(url, service, { auth: { persistSession: false } });
const { count, error } = await admin
  .from("blog_posts")
  .select("*", { count: "exact", head: true });
console.log("admin total count:", count, "err:", error?.message ?? null);

const { data: sample, error: e2 } = await admin
  .from("blog_posts")
  .select("slug,is_published,title,cover_image_url")
  .order("created_at", { ascending: false })
  .limit(15);
console.log("admin sample err:", e2?.message ?? null);
console.log(JSON.stringify(sample, null, 2));

const { count: pubCount } = await admin
  .from("blog_posts")
  .select("*", { count: "exact", head: true })
  .eq("is_published", true);
console.log("admin published count:", pubCount);

const pub = createClient(url, anon);
const { data: pubData, error: e3, count: anonCount } = await pub
  .from("blog_posts")
  .select("slug,is_published", { count: "exact" })
  .eq("is_published", true)
  .limit(5);
console.log("anon published count:", anonCount, "err:", e3?.message ?? null);
console.log("anon rows:", JSON.stringify(pubData, null, 2));
