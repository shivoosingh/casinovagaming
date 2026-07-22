import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { GAMES, getGameBySlug } from "@/lib/games";
import { getAuthUser } from "@/lib/supabase/session";

export type MyGameAccount = {
  id: string;
  gameSlug: string;
  gameName: string;
  gameImage: string | null;
  gameUsername: string;
  status: "active" | "pending" | "failed";
  loadType: string;
  createdAt: string;
  completedAt: string | null;
  pending: boolean;
};

export type ActiveJob = { loadType: string; status: string };

function metaForSlug(slug: string, fallbackName?: string | null) {
  const g = getGameBySlug(slug);
  return {
    name: g?.name ?? fallbackName ?? slug,
    image: g?.image ?? null,
  };
}

/** Accounts created (or creating) for the signed-in user, from game_load_requests. */
export async function getMyGameAccounts(): Promise<MyGameAccount[]> {
  const user = await getAuthUser();
  if (!user) return [];

  const admin = createAdminClient();
  const supabase = admin ?? (await createClient());

  const { data: completed, error } = await supabase
    .from("game_load_requests")
    .select(
      "id, game_slug, game_name, game_username, load_type, status, created_at, completed_at"
    )
    .eq("user_id", user.id)
    .eq("status", "completed")
    .in("load_type", ["create_account", "new_account"])
    .not("game_username", "is", null)
    .order("completed_at", { ascending: false });

  if (error) {
    console.error("[getMyGameAccounts]", error.message);
  }

  const list: MyGameAccount[] = [];
  const seen = new Set<string>();

  for (const row of completed ?? []) {
    if (!row.game_slug || seen.has(row.game_slug)) continue;
    const meta = metaForSlug(row.game_slug, row.game_name);
    list.push({
      id: row.id,
      gameSlug: row.game_slug,
      gameName: meta.name,
      gameImage: meta.image,
      gameUsername: row.game_username!,
      status: "active",
      loadType: row.load_type,
      createdAt: row.created_at,
      completedAt: row.completed_at,
      pending: false,
    });
    seen.add(row.game_slug);
  }

  const { data: inFlight } = await supabase
    .from("game_load_requests")
    .select("id, game_slug, game_name, game_username, load_type, status, created_at, completed_at")
    .eq("user_id", user.id)
    .in("status", ["pending", "processing"])
    .in("load_type", ["create_account", "new_account"])
    .order("created_at", { ascending: false });

  for (const row of inFlight ?? []) {
    if (!row.game_slug || seen.has(row.game_slug)) continue;
    const meta = metaForSlug(row.game_slug, row.game_name);
    list.push({
      id: row.id,
      gameSlug: row.game_slug,
      gameName: meta.name,
      gameImage: meta.image,
      gameUsername: row.game_username?.trim() || "creating…",
      status: "pending",
      loadType: row.load_type,
      createdAt: row.created_at,
      completedAt: null,
      pending: true,
    });
    seen.add(row.game_slug);
  }

  return list;
}

export async function getActiveJobsByGame(): Promise<Record<string, ActiveJob>> {
  const user = await getAuthUser();
  if (!user) return {};

  const supabase = await createClient();
  const { data } = await supabase
    .from("game_load_requests")
    .select("game_slug, load_type, status, created_at")
    .eq("user_id", user.id)
    .in("status", ["pending", "processing"])
    .order("created_at", { ascending: false });

  const map: Record<string, ActiveJob> = {};
  for (const j of data ?? []) {
    if (!j.game_slug || map[j.game_slug]) continue;
    map[j.game_slug] = { loadType: j.load_type, status: j.status };
  }
  return map;
}

export async function getMyWalletBalance(): Promise<number> {
  const user = await getAuthUser();
  if (!user) return 0;
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("wallet_balance")
    .eq("id", user.id)
    .maybeSingle();
  return Number(data?.wallet_balance ?? 0);
}

/** Recent load / redeem / create job log for My Games detail strip. */
export async function getMyGameJobLog(limit = 20) {
  const user = await getAuthUser();
  if (!user) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("game_load_requests")
    .select(
      "id, game_slug, game_name, game_username, load_type, status, amount, created_at, completed_at, error_message"
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((row) => {
    const meta = metaForSlug(row.game_slug, row.game_name);
    return {
      id: row.id as string,
      gameSlug: row.game_slug as string,
      gameName: meta.name,
      gameImage: meta.image,
      load_type: row.load_type as string,
      status: row.status as string,
      amount: row.amount == null ? null : Number(row.amount),
      created_at: row.created_at as string,
      error_message: (row.error_message as string | null) ?? null,
    };
  });
}

export function catalogGamesWithoutAccount(ownedSlugs: string[]) {
  const owned = new Set(ownedSlugs);
  return GAMES.filter((g) => !g.upcoming && !owned.has(g.slug));
}
