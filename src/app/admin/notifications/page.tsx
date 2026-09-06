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
        title="Broadcasts & Promos"
        description="Send in-app promos to every player with one-click templates — deposit bonus, weekend reload, free spin, and more."
      />

      <BroadcastComposer />

      <section className="mt-8 rounded-2xl border border-violet-400/20 bg-[rgba(18,14,34,0.5)] p-5">
        <h2 className="text-sm font-bold uppercase tracking-wider text-violet-300/80">
          How it works
        </h2>
        <ul className="mt-3 space-y-2 text-sm text-slate-400">
          <li>Pick a template and click <strong className="text-violet-200">Send now</strong> — or load, edit, then send.</li>
          <li>Every player gets a notification in their bell icon; enable Support chat to mirror the message.</li>
          <li>Promo templates use type <code className="text-violet-200">promo</code> so they stand out in the inbox.</li>
        </ul>
      </section>
    </div>
  );
}
