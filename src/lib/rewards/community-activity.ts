"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export type ActivityItem = {
  id: string;
  name: string;
  action: string;
  at: string;
};

function firstName(fullName: string | null | undefined, email: string | null | undefined): string {
  const name = fullName?.trim();
  if (name) return name.split(/\s+/)[0] ?? "Player";
  const local = email?.split("@")[0];
  return local ? local.slice(0, 12) : "Player";
}

export async function getCommunityActivity(): Promise<ActivityItem[]> {
  const admin = createAdminClient();
  if (!admin) return [];

  const [signups, spins] = await Promise.all([
    admin
      .from("profiles")
      .select("id, full_name, email, created_at")
      .order("created_at", { ascending: false })
      .limit(6),
    admin
      .from("wheel_spins")
      .select("id, prize_label, created_at, user_id")
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  const items: ActivityItem[] = [];

  for (const row of signups.data ?? []) {
    items.push({
      id: `join-${row.id}`,
      name: firstName(row.full_name, row.email),
      action: "joined Casinova",
      at: row.created_at,
    });
  }

  const spinRows = spins.data ?? [];
  if (spinRows.length) {
    const ids = [...new Set(spinRows.map((row) => row.user_id).filter(Boolean))];
    const { data: people } = await admin.from("profiles").select("id, full_name, email").in("id", ids);
    const byId = new Map((people ?? []).map((person) => [person.id, person]));
    for (const row of spinRows) {
      const person = byId.get(row.user_id);
      items.push({
        id: `spin-${row.id}`,
        name: firstName(person?.full_name, person?.email),
        action: `won ${row.prize_label || "a spin prize"}`,
        at: row.created_at,
      });
    }
  }

  return items.sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 6);
}
