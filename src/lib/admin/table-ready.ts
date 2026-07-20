import "server-only";

import { adminDb } from "@/lib/actions/admin/core";

/** Returns true if PostgREST can query the table (SQL pack applied). */
export async function adminTableReady(table: string): Promise<boolean> {
  try {
    const db = adminDb();
    const { error } = await db.from(table).select("*").limit(1);
    if (!error) return true;
    const msg = (error.message || "").toLowerCase();
    if (msg.includes("does not exist") || msg.includes("schema cache") || error.code === "PGRST205") {
      return false;
    }
    // Other errors (empty RLS etc.) still mean table exists
    return true;
  } catch {
    return false;
  }
}
