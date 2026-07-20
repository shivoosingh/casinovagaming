import type { Metadata } from "next";
import { DollarSign, TrendingUp, UserCheck, Users } from "lucide-react";

import { CrmPlayersPanel } from "@/components/admin/crm-players-panel";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import {
  getCrmOverviewStats,
  getCrmPlayersPage,
  type CrmSegment,
} from "@/lib/data/admin-crm";
import { requirePermission } from "@/lib/data/admin";

export const metadata: Metadata = { title: "CRM" };

const SEGMENTS = [
  { key: "all", label: "All Players" },
  { key: "new", label: "New (7d)" },
  { key: "active", label: "Active (7d)" },
  { key: "vip", label: "VIP" },
  { key: "banned", label: "Suspended" },
] as const;

export default async function AdminCrmPage({
  searchParams,
}: {
  searchParams: Promise<{ segment?: string; page?: string }>;
}) {
  await requirePermission("users.manage");
  const params = await searchParams;
  const segment = (SEGMENTS.find((s) => s.key === params.segment)?.key ?? "all") as CrmSegment;
  const page = Math.max(1, Number(params.page) || 1);

  const [stats, playersPage] = await Promise.all([
    getCrmOverviewStats(),
    getCrmPlayersPage(segment, page),
  ]);

  const statCards = [
    {
      label: "Total players",
      value: stats.totalPlayers.toLocaleString(),
      icon: Users,
      accent: "text-cyan-300",
    },
    {
      label: "New this week",
      value: stats.newThisWeek.toLocaleString(),
      icon: TrendingUp,
      accent: "text-emerald-300",
    },
    {
      label: "Active last 7 days",
      value: stats.activeLast7d.toLocaleString(),
      icon: UserCheck,
      accent: "text-violet-300",
    },
    {
      label: "Total fulfilled ($)",
      value: `$${stats.totalFulfilled.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
      icon: DollarSign,
      accent: "text-amber-300",
    },
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <AdminPageHeader
        title="CRM"
        description="Customer intelligence — player activity, deposit history, and contact details from profiles + deposit_requests."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className="rounded-2xl border border-violet-400/25 bg-[rgba(18,14,34,0.72)] p-4"
            >
              <div className={`mb-2 flex items-center gap-2 ${s.accent}`}>
                <Icon className="h-4 w-4" />
                <span className="text-[11px] font-bold uppercase tracking-wider">
                  {s.label}
                </span>
              </div>
              <p className="text-2xl font-black text-white">{s.value}</p>
            </div>
          );
        })}
      </div>

      <CrmPlayersPanel
        initialSegment={segment}
        initialPage={page}
        initialData={playersPage}
      />
    </div>
  );
}
