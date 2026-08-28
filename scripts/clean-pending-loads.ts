import fs from "fs";
import path from "path";

// Manually load env vars from .env.local
try {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, "utf8");
    for (const line of envConfig.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx > 0) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
        process.env[key] = val;
      }
    }
  }
} catch (e) {
  console.error("Error reading .env.local:", e);
}

import { createAdminClient } from "../src/lib/supabase/admin";

async function cleanPendingLoads() {
  console.log("=== Cleaning stuck pending game load requests in Supabase ===");
  const admin = createAdminClient();

  if (!admin) {
    console.error("Supabase admin client unavailable");
    return;
  }

  // 1. Fetch all pending or processing requests
  const { data: rows, error: fetchErr } = await admin
    .from("game_load_requests")
    .select("id, user_id, game_slug, load_type, status, created_at")
    .in("status", ["pending", "processing"]);

  if (fetchErr) {
    console.error("Error fetching pending requests:", fetchErr.message);
    return;
  }

  console.log(`Found ${rows?.length || 0} stuck pending/processing request(s).`);

  if (!rows || rows.length === 0) {
    console.log("No stuck requests found!");
    return;
  }

  for (const r of rows) {
    console.log(`Cancelling request id: ${r.id} | game: ${r.game_slug} | type: ${r.load_type} | created: ${r.created_at}`);

    const { error: updErr } = await admin
      .from("game_load_requests")
      .update({
        status: "cancelled",
        error_message: "Stuck request cleared by admin",
        updated_at: new Date().toISOString(),
      })
      .eq("id", r.id);

    if (updErr) {
      console.error(`Failed to cancel request ${r.id}:`, updErr.message);
    } else {
      console.log(`Successfully cancelled request ${r.id}`);
    }
  }

  console.log("=== Cleanup Finished ===");
}

cleanPendingLoads().catch(console.error);
