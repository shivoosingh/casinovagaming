"use client";

import { AdminBroadcastNotice } from "@/components/admin/admin-broadcast-notice";

/** Broadcast composer for /admin/notifications — uses Casinova broadcastAdminNotice RPC. */
export function BroadcastComposer() {
  return <AdminBroadcastNotice />;
}
