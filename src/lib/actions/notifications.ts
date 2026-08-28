"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type NotificationType = "info" | "success" | "warning" | "promo";

export async function createNotification(
  userId: string,
  title: string,
  message: string,
  type: NotificationType = "info"
) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_notification", {
    p_user_id: userId,
    p_title: title,
    p_message: message,
    p_type: type,
  });

  if (error) {
    // Fallback: direct insert into notifications table if RPC fails or is missing
    const { error: insertError } = await supabase.from("notifications").insert({
      user_id: userId,
      title,
      message,
      type,
      is_read: false,
    });
    if (insertError) {
      return { error: insertError.message };
    }
  }

  revalidatePath("/dashboard");
  return { success: true };
}

export async function markNotificationsRead() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", user.id)
    .eq("is_read", false);

  revalidatePath("/dashboard");
  return { success: true };
}
