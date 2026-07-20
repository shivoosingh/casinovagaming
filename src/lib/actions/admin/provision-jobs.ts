"use server";

import { revalidatePath } from "next/cache";

import { adminDb, authorize } from "@/lib/actions/admin/core";

const BOT_LOAD_TYPES = ["new_account", "create_account", "check_balance"] as const;

export async function retryProvisionJob(id: string): Promise<void> {
  const auth = await authorize("requests.manage");
  if ("error" in auth) return;

  await adminDb()
    .from("game_load_requests")
    .update({
      status: "pending",
      error_message: null,
      bot_attempts: 0,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .in("load_type", [...BOT_LOAD_TYPES])
    .eq("status", "failed");

  revalidatePath("/admin/provision-jobs");
}

export async function cancelProvisionJob(id: string): Promise<void> {
  const auth = await authorize("requests.manage");
  if ("error" in auth) return;

  await adminDb()
    .from("game_load_requests")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", id)
    .in("load_type", [...BOT_LOAD_TYPES])
    .in("status", ["pending", "processing", "failed"]);

  revalidatePath("/admin/provision-jobs");
}
