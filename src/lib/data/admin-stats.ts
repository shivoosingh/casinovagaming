import "server-only";

import { unstable_cache } from "next/cache";

import { adminDb } from "@/lib/actions/admin/core";

export type DashboardStats = {
  totalUsers: number;
  newUsersInWindow: number;
  coinsIssuedInWindow: number;
  pendingRequests: number;
  openTickets: number;
};

/** Pulse-of-the-platform numbers for the admin overview (and bots). */
export const getDashboardStats = unstable_cache(
  async (windowMs: number): Promise<DashboardStats> => {
    const db = adminDb();
    const sinceIso = new Date(Date.now() - windowMs).toISOString();

    const [totalUsers, newUsers, credits, pendingRequests, openTickets] = await Promise.all([
      db.from("profiles").select("id", { count: "exact", head: true }),
      db.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", sinceIso),
      db
        .from("wallet_transactions")
        .select("amount")
        .eq("transaction_type", "credit")
        .gt("amount", 0)
        .gte("created_at", sinceIso)
        .limit(5000),
      db
        .from("deposit_requests")
        .select("id", { count: "exact", head: true })
        .in("status", ["pending", "processing"]),
      db
        .from("support_tickets")
        .select("id", { count: "exact", head: true })
        .in("status", ["open", "pending", "in_progress"]),
    ]);

    return {
      totalUsers: totalUsers.count ?? 0,
      newUsersInWindow: newUsers.count ?? 0,
      coinsIssuedInWindow: (credits.data ?? []).reduce(
        (sum, e) => sum + Number(e.amount ?? 0),
        0
      ),
      pendingRequests: pendingRequests.count ?? 0,
      openTickets: openTickets.count ?? 0,
    };
  },
  ["admin-dashboard-stats"],
  { revalidate: 60 }
);
