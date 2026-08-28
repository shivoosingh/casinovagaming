"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createNotification } from "@/lib/actions/notifications";

export async function updateUserRole(userId: string, role: "user" | "admin") {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") return { error: "Unauthorized" };

  const { error } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", userId);

  if (error) return { error: error.message };
  revalidatePath("/admin/users");
  return { success: true };
}

export async function suspendUser(userId: string, suspended: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") return { error: "Unauthorized" };

  const { error } = await supabase
    .from("profiles")
    .update({ is_suspended: suspended })
    .eq("id", userId);

  if (error) return { error: error.message };
  revalidatePath("/admin/users");
  return { success: true };
}

export async function sendAdminMessage(
  conversationId: string,
  content: string,
  attachment?: {
    url: string;
    type: "image" | "file";
    name: string;
  }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") return { error: "Unauthorized" };

  if (!content.trim() && !attachment) {
    return { error: "Message cannot be empty" };
  }

  const { error, data: inserted } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content: content.trim(),
      ...(attachment && {
        attachment_url: attachment.url,
        attachment_type: attachment.type,
        attachment_name: attachment.name,
      }),
    })
    .select("*")
    .single();

  if (error) {
    const hint = error.message.includes("attachment_")
      ? " Run supabase/chat-attachments.sql in Supabase SQL Editor first."
      : "";
    return { error: `${error.message}${hint}` };
  }

  const { data: conversation } = await supabase
    .from("conversations")
    .select("user_id")
    .eq("id", conversationId)
    .single();

  if (conversation?.user_id) {
    const preview =
      content.trim() ||
      (attachment?.type === "image" ? "Sent you an image" : attachment ? "Sent you a file" : "Sent you a message");
    await createNotification(
      conversation.user_id,
      "New message from Support",
      preview.length > 140 ? `${preview.slice(0, 137)}...` : preview,
      "info"
    );
  }

  await supabase
    .from("conversations")
    .update({ updated_at: new Date().toISOString(), admin_id: user.id })
    .eq("id", conversationId);

  revalidatePath("/admin/chat");
  return { success: true, message: inserted };
}

const DEFAULT_MAINTENANCE_NOTICE = {
  title: "Site under maintenance",
  message:
    "Spinora is currently under maintenance. No requests (loads, redeems, new accounts, or deposits) will be approved until further notice. Thank you for your patience — we will update you when service resumes.",
} as const;

/** Send an in-app notification (+ support chat message) to every non-admin user. */
export async function broadcastAdminNotice(input: {
  title: string;
  message: string;
  type?: "info" | "success" | "warning" | "promo";
  sendChat?: boolean;
}) {
  const auth = await requireAdmin();
  if (auth.error) return { error: auth.error };

  const title = input.title.trim();
  const message = input.message.trim();
  if (!title || !message) return { error: "Title and message are required" };

  const type = input.type ?? "warning";
  const sendChat = input.sendChat ?? true;

  // Attempt RPC execution first
  const { data, error } = await auth.supabase.rpc("admin_broadcast_to_all_users", {
    p_title: title,
    p_message: message,
    p_type: type,
    p_send_chat: sendChat,
  });

  if (!error) {
    revalidatePath("/admin");
    revalidatePath("/admin/chat");
    return { success: true, count: Number(data ?? 0) };
  }

  // Fallback: direct database operations if RPC is missing or fails
  try {
    const adminClient = createAdminClient() ?? auth.supabase;

    // Fetch all non-admin profiles (role is not 'admin')
    const { data: profiles, error: profileErr } = await adminClient
      .from("profiles")
      .select("id, role");

    if (profileErr) {
      return { error: profileErr.message };
    }

    const targetUsers = (profiles || []).filter((p) => p.role !== "admin");
    const targetUserIds = targetUsers.map((p) => p.id);

    if (targetUserIds.length === 0) {
      return { success: true, count: 0 };
    }

    // Insert notifications in chunks of 500
    const notificationRows = targetUserIds.map((userId) => ({
      user_id: userId,
      title,
      message,
      type,
      is_read: false,
    }));

    const BATCH_SIZE = 500;
    for (let i = 0; i < notificationRows.length; i += BATCH_SIZE) {
      const chunk = notificationRows.slice(i, i + BATCH_SIZE);
      const { error: notifErr } = await adminClient.from("notifications").insert(chunk);
      if (notifErr) {
        console.error("Direct notification insert error:", notifErr);
      }
    }

    // If sendChat is requested, post a support message to each user's conversation
    if (sendChat) {
      const chatContent = `${title}\n\n${message}`;
      const senderId = auth.user.id;

      for (const userId of targetUserIds) {
        try {
          let conversationId: string | null = null;
          const { data: existingConv } = await adminClient
            .from("conversations")
            .select("id")
            .eq("user_id", userId)
            .eq("is_active", true)
            .order("updated_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (existingConv?.id) {
            conversationId = existingConv.id;
            await adminClient
              .from("conversations")
              .update({ admin_id: senderId, updated_at: new Date().toISOString() })
              .eq("id", conversationId);
          } else {
            const { data: newConv } = await adminClient
              .from("conversations")
              .insert({ user_id: userId, admin_id: senderId })
              .select("id")
              .single();
            if (newConv?.id) conversationId = newConv.id;
          }

          if (conversationId) {
            await adminClient.from("messages").insert({
              conversation_id: conversationId,
              sender_id: senderId,
              content: chatContent,
              is_read: false,
            });
          }
        } catch (chatErr) {
          console.error(`Error broadcasting chat message to user ${userId}:`, chatErr);
        }
      }
    }

    revalidatePath("/admin");
    revalidatePath("/admin/chat");
    return { success: true, count: targetUserIds.length };
  } catch (fallbackErr: any) {
    return { error: fallbackErr.message || "Failed to broadcast message." };
  }
}

export async function broadcastMaintenanceNotice() {
  return broadcastAdminNotice({
    ...DEFAULT_MAINTENANCE_NOTICE,
    type: "warning",
    sendChat: true,
  });
}

export interface AdminUserSearchResult {
  id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  whatsapp: string | null;
  conversationId: string | null;
}

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" as const, supabase, user: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") return { error: "Unauthorized" as const, supabase, user: null };
  return { supabase, user, error: null };
}

export async function searchUsersForAdmin(query: string): Promise<{
  users?: AdminUserSearchResult[];
  error?: string;
}> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return { users: [] };

  const auth = await requireAdmin();
  if (auth.error) return { error: auth.error, users: [] };

  const pattern = `"%${trimmed.replace(/"/g, '""')}%"`;
  const { data: users, error } = await auth.supabase
    .from("profiles")
    .select("id, full_name, email, phone, whatsapp, role")
    .eq("role", "user")
    .or(
      `full_name.ilike.${pattern},email.ilike.${pattern},phone.ilike.${pattern},whatsapp.ilike.${pattern}`
    )
    .order("created_at", { ascending: false })
    .limit(15);

  if (error) return { error: error.message, users: [] };
  if (!users?.length) return { users: [] };

  const userIds = users.map((u) => u.id);
  const { data: conversations } = await auth.supabase
    .from("conversations")
    .select("id, user_id")
    .in("user_id", userIds)
    .eq("is_active", true);

  const convByUser = new Map(conversations?.map((c) => [c.user_id, c.id]) ?? []);

  return {
    users: users.map((u) => ({
      id: u.id,
      full_name: u.full_name,
      email: u.email,
      phone: u.phone,
      whatsapp: u.whatsapp,
      conversationId: convByUser.get(u.id) ?? null,
    })),
  };
}

export async function ensureAdminConversation(targetUserId: string): Promise<{
  conversationId?: string;
  user?: { full_name: string | null; email: string; is_online?: boolean };
  error?: string;
}> {
  const auth = await requireAdmin();
  if (auth.error) return { error: auth.error };

  const { data: targetUser } = await auth.supabase
    .from("profiles")
    .select("id, role, full_name, email, is_online")
    .eq("id", targetUserId)
    .single();

  if (!targetUser) return { error: "User not found" };
  if (targetUser.role === "admin") return { error: "Cannot start a chat with an admin account" };

  const { data: existing } = await auth.supabase
    .from("conversations")
    .select("id")
    .eq("user_id", targetUserId)
    .eq("is_active", true)
    .maybeSingle();

  if (existing) {
    return {
      conversationId: existing.id,
      user: {
        full_name: targetUser.full_name,
        email: targetUser.email,
        is_online: targetUser.is_online,
      },
    };
  }

  const { data: created, error } = await auth.supabase
    .from("conversations")
    .insert({ user_id: targetUserId, admin_id: auth.user!.id })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/admin/chat");
  return {
    conversationId: created.id,
    user: {
      full_name: targetUser.full_name,
      email: targetUser.email,
      is_online: targetUser.is_online,
    },
  };
}
