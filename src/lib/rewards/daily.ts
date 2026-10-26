"use server";

import { vipTierForPoints } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const SETTINGS_KEY = "player_daily";

type Row = {
  lastClaim?: string;
  streak?: number;
  spinClaim?: string;
};

type Store = Record<string, Row>;

export type DailyStatus = {
  streak: number;
  claimedToday: boolean;
  spunToday: boolean;
  spinRewardClaimed: boolean;
  todayPoints: number;
};

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayUtc(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

function pointsForStreak(streak: number): number {
  return 5 + Math.min(Math.max(streak - 1, 0), 6);
}

async function readStore(admin: NonNullable<ReturnType<typeof createAdminClient>>): Promise<Store> {
  const { data, error } = await admin.from("site_settings").select("value").eq("key", SETTINGS_KEY).maybeSingle();
  if (error || !data?.value || typeof data.value !== "object") return {};
  return data.value as Store;
}

async function writeStore(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  store: Store
): Promise<string | null> {
  const { data: existing } = await admin.from("site_settings").select("key").eq("key", SETTINGS_KEY).maybeSingle();
  if (existing) {
    const { error } = await admin
      .from("site_settings")
      .update({ value: store, updated_at: new Date().toISOString() })
      .eq("key", SETTINGS_KEY);
    return error?.message ?? null;
  }
  const { error } = await admin.from("site_settings").insert({
    key: SETTINGS_KEY,
    value: store,
    description: "Daily check-in streaks. VIP points only.",
  });
  return error?.message ?? null;
}

async function addVipPoints(admin: NonNullable<ReturnType<typeof createAdminClient>>, userId: string, points: number) {
  const { data: profile } = await admin.from("profiles").select("vip_points").eq("id", userId).maybeSingle();
  if (!profile) return;
  const next = Number(profile.vip_points ?? 0) + points;
  await admin.from("profiles").update({ vip_points: next, vip_tier: vipTierForPoints(next) }).eq("id", userId);
}

async function spunToday(userId: string): Promise<boolean> {
  const supabase = await createClient();
  const start = `${todayUtc()}T00:00:00.000Z`;
  const { count } = await supabase
    .from("wheel_spins")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", start);
  return (count ?? 0) > 0;
}

export async function getDailyStatus(): Promise<DailyStatus | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to see daily rewards." };

  const admin = createAdminClient();
  if (!admin) return { error: "Daily rewards are not configured." };

  const store = await readStore(admin);
  const row = store[user.id] ?? {};
  const today = todayUtc();
  const claimedToday = row.lastClaim === today;
  const streak = claimedToday || row.lastClaim === yesterdayUtc() ? Number(row.streak ?? 0) : 0;

  return {
    streak,
    claimedToday,
    spunToday: await spunToday(user.id),
    spinRewardClaimed: row.spinClaim === today,
    todayPoints: pointsForStreak(claimedToday ? streak : streak + 1),
  };
}

export async function claimDailyLogin(): Promise<{ ok: true; points: number; streak: number } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in first." };

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Daily rewards are not configured." };

  const store = await readStore(admin);
  const row = store[user.id] ?? {};
  const today = todayUtc();
  if (row.lastClaim === today) return { ok: false, error: "You already checked in today." };

  const streak = row.lastClaim === yesterdayUtc() ? Number(row.streak ?? 0) + 1 : 1;
  const points = pointsForStreak(streak);
  store[user.id] = { ...row, lastClaim: today, streak };
  const writeError = await writeStore(admin, store);
  if (writeError) return { ok: false, error: writeError };
  await addVipPoints(admin, user.id, points);
  return { ok: true, points, streak };
}

export async function claimSpinMission(): Promise<{ ok: true; points: number } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in first." };
  if (!(await spunToday(user.id))) return { ok: false, error: "Spin the wheel first, then claim this." };

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Daily rewards are not configured." };

  const store = await readStore(admin);
  const row = store[user.id] ?? {};
  const today = todayUtc();
  if (row.spinClaim === today) return { ok: false, error: "Spin reward already claimed today." };

  store[user.id] = { ...row, spinClaim: today };
  const writeError = await writeStore(admin, store);
  if (writeError) return { ok: false, error: writeError };
  await addVipPoints(admin, user.id, 5);
  return { ok: true, points: 5 };
}
