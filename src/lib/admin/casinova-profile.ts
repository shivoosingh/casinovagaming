/** Map Casinova `profiles` rows to labels the admin UI expects. */

export type CasinovaProfileRow = {
  id?: string;
  email?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
  wallet_balance?: number | null;
  cashout_wallet?: number | null;
  is_suspended?: boolean | null;
  created_at?: string;
  last_seen_at?: string | null;
  referral_code?: string | null;
  vip_points?: number | null;
  vip_tier?: string | null;
  role?: string | null;
};

/** Columns safe to select from Casinova profiles in admin queries. */
export const ADMIN_PROFILE_SELECT =
  "id, email, full_name, avatar_url, wallet_balance, cashout_wallet, is_suspended, created_at, last_seen_at, referral_code, vip_points, vip_tier, role";

export const ADMIN_PROFILE_EMBED = "email, full_name";

export function profileDisplayName(p: CasinovaProfileRow): string {
  const name = p.full_name?.trim();
  if (name) return name;
  const email = p.email?.trim();
  if (email) return email.split("@")[0] ?? email;
  return "Player";
}

export function profileHandle(p: CasinovaProfileRow): string {
  const email = p.email?.trim();
  if (email) return email;
  return p.id?.slice(0, 8) ?? "player";
}

export function profileInitials(p: CasinovaProfileRow): string {
  const name = profileDisplayName(p);
  return name.slice(0, 2).toUpperCase();
}

export function profileIsBanned(p: CasinovaProfileRow): boolean {
  return Boolean(p.is_suspended);
}

export function profileNum(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function profileFromEmbed(
  embed: { email?: string | null; full_name?: string | null } | null | undefined,
  id = ""
): CasinovaProfileRow {
  return {
    id,
    email: embed?.email ?? null,
    full_name: embed?.full_name ?? null,
  };
}
