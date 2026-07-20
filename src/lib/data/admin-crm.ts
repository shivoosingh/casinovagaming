import "server-only";

import { unstable_cache } from "next/cache";

import { adminDb } from "@/lib/actions/admin/core";

export const CRM_PAGE_SIZE = 25;

export type CrmSegment = "all" | "new" | "active" | "vip" | "banned";

export type CrmProfileRow = {
  id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  whatsapp: string | null;
  role: string;
  is_suspended: boolean;
  vip_tier: string;
  vip_points: number;
  wallet_balance: number;
  created_at: string;
  last_seen_at: string | null;
};

export type CrmOverviewStats = {
  totalPlayers: number;
  newThisWeek: number;
  activeLast7d: number;
  totalFulfilled: number;
};

export type CrmPlayerRow = {
  profile: CrmProfileRow;
  deposits: { fulfilledCount: number; totalDeposited: number } | null;
};

export type CrmPlayersPage = {
  rows: CrmPlayerRow[];
  total: number;
  page: number;
  totalPages: number;
};

const PROFILE_SELECT =
  "id, full_name, email, phone, whatsapp, role, is_suspended, vip_tier, vip_points, wallet_balance, created_at, last_seen_at";

function since7dIso() {
  return new Date(Date.now() - 7 * 86_400_000).toISOString();
}

async function fetchOverviewStatsUncached(): Promise<CrmOverviewStats> {
  const db = adminDb();
  const since = since7dIso();

  const [totalResult, newResult, activeResult, fulfilledRows] = await Promise.all([
    db.from("profiles").select("id", { count: "exact", head: true }).eq("role", "user"),
    db
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "user")
      .gte("created_at", since),
    db
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "user")
      .gte("last_seen_at", since),
    db.from("deposit_requests").select("amount").eq("status", "completed").limit(5000),
  ]);

  const totalFulfilled = (fulfilledRows.data ?? []).reduce(
    (sum, row) => sum + Number(row.amount ?? 0),
    0
  );

  return {
    totalPlayers: totalResult.count ?? 0,
    newThisWeek: newResult.count ?? 0,
    activeLast7d: activeResult.count ?? 0,
    totalFulfilled,
  };
}

export const getCrmOverviewStats = unstable_cache(
  fetchOverviewStatsUncached,
  ["admin-crm-overview-stats"],
  { revalidate: 90 }
);

async function depositStatsForUsers(
  userIds: string[]
): Promise<Map<string, { fulfilledCount: number; totalDeposited: number }>> {
  const map = new Map<string, { fulfilledCount: number; totalDeposited: number }>();
  if (!userIds.length) return map;

  const db = adminDb();
  const { data: requestRows } = await db
    .from("deposit_requests")
    .select("user_id, amount")
    .in("user_id", userIds)
    .eq("status", "completed");

  for (const r of requestRows ?? []) {
    if (!r.user_id) continue;
    const existing = map.get(r.user_id) ?? { fulfilledCount: 0, totalDeposited: 0 };
    existing.fulfilledCount += 1;
    existing.totalDeposited += Number(r.amount ?? 0);
    map.set(r.user_id, existing);
  }

  return map;
}

export async function getCrmPlayersPage(
  segment: CrmSegment,
  page: number
): Promise<CrmPlayersPage> {
  const db = adminDb();
  const since = since7dIso();
  const safePage = Math.max(1, page);
  const from = (safePage - 1) * CRM_PAGE_SIZE;
  const to = from + CRM_PAGE_SIZE - 1;

  let profileQuery = db
    .from("profiles")
    .select(PROFILE_SELECT, { count: "exact" })
    .eq("role", "user")
    .order("created_at", { ascending: false });

  if (segment === "new") profileQuery = profileQuery.gte("created_at", since);
  else if (segment === "active") profileQuery = profileQuery.gte("last_seen_at", since);
  else if (segment === "vip") profileQuery = profileQuery.neq("vip_tier", "bronze");
  else if (segment === "banned") profileQuery = profileQuery.eq("is_suspended", true);

  const { data: profilesRaw, count: segmentCount } = await profileQuery.range(from, to);
  const profiles = (profilesRaw ?? []) as CrmProfileRow[];
  const total = segmentCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / CRM_PAGE_SIZE));
  const profileIds = profiles.map((p) => p.id);

  const depositMap = await depositStatsForUsers(profileIds);

  const rows: CrmPlayerRow[] = profiles.map((profile) => {
    const deposits = depositMap.get(profile.id);
    return {
      profile,
      deposits: deposits
        ? {
            fulfilledCount: deposits.fulfilledCount,
            totalDeposited: deposits.totalDeposited,
          }
        : null,
    };
  });

  return { rows, total, page: safePage, totalPages };
}
