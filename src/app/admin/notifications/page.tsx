import type { Metadata } from "next";

import { BroadcastComposer } from "@/components/admin/broadcast-composer";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { requirePermission } from "@/lib/data/admin";

export const metadata: Metadata = { title: "Broadcasts" };

export default async function AdminNotificationsPage() {
  await requirePermission("notifications.broadcast");

  return (
    <div className="mx-auto max-w-4xl">
      <AdminPageHeader
        title="Broadcasts"
        description="Send an in-app notice to every non-admin user. Optionally posts in their Support chat."
      />

      <BroadcastComposer />

      <section className="mt-8 rounded-2xl border border-violet-400/20 bg-[rgba(18,14,34,0.5)] p-5">
        <h2 className="text-sm font-bold uppercase tracking-wider text-violet-300/80">
          How it works
        </h2>
        <ul className="mt-3 space-y-2 text-sm text-slate-400">
          <li>Uses the <code className="text-violet-200">admin_broadcast_to_all_users</code> RPC.</li>
          <li>Every player gets a notification; enable Support chat to mirror the message there.</li>
          <li>Segment targeting is not enabled yet — this reaches all members.</li>
        </ul>
      </section>
    </div>
  );
}
