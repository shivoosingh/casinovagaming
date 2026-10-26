import type { Metadata } from "next";

import { AdminAgentBalancesCard } from "@/components/admin/admin-agent-balances-card";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { requirePermission } from "@/lib/data/admin";

export const metadata: Metadata = { title: "Agent Balances" };
export const dynamic = "force-dynamic";

export default async function AdminAgentBalancesPage() {
  await requirePermission("requests.manage");

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <AdminPageHeader
        title="Game store coins"
        description="How many coins are left on each game backend. Low balance = loads can fail."
      />
      <AdminAgentBalancesCard />
    </div>
  );
}
