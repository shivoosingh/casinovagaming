import type { Metadata } from "next";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  cancelProvisionJob,
  retryProvisionJob,
} from "@/lib/actions/admin/provision-jobs";
import { adminDb } from "@/lib/actions/admin/core";
import { requirePermission } from "@/lib/data/admin";

export const metadata: Metadata = { title: "Bot Jobs" };
export const dynamic = "force-dynamic";

const BOT_LOAD_TYPES = ["new_account", "create_account", "check_balance"] as const;

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-300",
  processing: "bg-blue-500/15 text-blue-300",
  completed: "bg-emerald-500/15 text-emerald-300",
  failed: "bg-red-500/15 text-red-300",
  cancelled: "bg-slate-500/15 text-slate-400",
};

const TYPE_LABELS: Record<string, string> = {
  new_account: "Create",
  create_account: "Create",
  check_balance: "Balance",
};

const RETRYABLE = new Set(["new_account", "create_account", "check_balance"]);

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AdminProvisionJobsPage() {
  await requirePermission("requests.manage");
  const db = adminDb();

  const { data } = await db
    .from("game_load_requests")
    .select(
      "id, user_id, game_name, game_username, amount, wallet_type, load_type, status, bot_attempts, wallet_refunded, error_message, created_at"
    )
    .in("load_type", [...BOT_LOAD_TYPES])
    .order("created_at", { ascending: false })
    .limit(200);

  type JobRow = {
    id: string;
    user_id: string;
    game_name: string;
    game_username: string | null;
    amount: number;
    wallet_type: string;
    load_type: string;
    status: string;
    bot_attempts: number;
    wallet_refunded: boolean;
    error_message: string | null;
    created_at: string;
  };

  const rows = (data ?? []) as JobRow[];

  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const { data: profs } = userIds.length
    ? await db.from("profiles").select("id, email, full_name").in("id", userIds)
    : { data: [] };

  const nameById = new Map(
    (profs ?? []).map((p) => [p.id, p.full_name || p.email || "—"])
  );

  const pending = rows.filter((r) => r.status === "pending").length;
  const processing = rows.filter((r) => r.status === "processing").length;
  const failed = rows.filter((r) => r.status === "failed").length;

  return (
    <div className="mx-auto max-w-7xl">
      <AdminPageHeader
        title="Bot Jobs"
        description={`${rows.length} bot jobs · ${pending} pending · ${processing} processing · ${failed} failed — account creation and balance checks for the local bot fleet`}
      />

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-violet-400/25 bg-[rgba(18,14,34,0.72)] py-16 text-center text-slate-400">
          No bot jobs yet. Jobs appear when players create accounts or request balance checks.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-violet-400/25 bg-[rgba(18,14,34,0.72)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-violet-500/20 text-[11px] uppercase tracking-wider text-violet-300/70">
                <tr>
                  <th className="px-4 py-3 font-bold">When</th>
                  <th className="px-4 py-3 font-bold">Game</th>
                  <th className="px-4 py-3 font-bold">Player</th>
                  <th className="px-4 py-3 font-bold">Action</th>
                  <th className="px-4 py-3 font-bold">Username</th>
                  <th className="px-4 py-3 text-right font-bold">Tries</th>
                  <th className="px-4 py-3 font-bold">Status</th>
                  <th className="px-4 py-3 font-bold">Error</th>
                  <th className="px-4 py-3 text-right font-bold">Manage</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-white/[0.04]">
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                      {formatDate(r.created_at)}
                    </td>
                    <td className="px-4 py-3 text-white">{r.game_name}</td>
                    <td className="max-w-[140px] truncate px-4 py-3 text-slate-400">
                      {nameById.get(r.user_id) ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className="bg-violet-500/15 text-violet-200">
                        {TYPE_LABELS[r.load_type] ?? r.load_type}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {r.game_username ? `@${r.game_username}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-400">{r.bot_attempts}</td>
                    <td className="px-4 py-3">
                      <Badge className={STATUS_COLORS[r.status] ?? "bg-slate-500/15"}>
                        {r.status}
                      </Badge>
                    </td>
                    <td
                      className="max-w-[220px] truncate px-4 py-3 text-xs text-red-400"
                      title={r.error_message ?? ""}
                    >
                      {r.error_message ?? ""}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        {r.status === "failed" && RETRYABLE.has(r.load_type) && (
                          <form action={retryProvisionJob.bind(null, r.id)}>
                            <Button type="submit" size="sm" variant="outline">
                              Retry
                            </Button>
                          </form>
                        )}
                        {RETRYABLE.has(r.load_type) &&
                          ["pending", "processing", "failed"].includes(r.status) && (
                            <form action={cancelProvisionJob.bind(null, r.id)}>
                              <Button type="submit" size="sm" variant="ghost">
                                Cancel
                              </Button>
                            </form>
                          )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
