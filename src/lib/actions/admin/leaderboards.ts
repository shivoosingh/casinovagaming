"use server";

import { revalidatePath } from "next/cache";

import { type AdminActionResult, authorize, isMissingRelation, RUN_ADMIN_SQL_HINT, writeAudit } from "@/lib/actions/admin/core";
import { createClient } from "@/lib/supabase/server";

const PERMISSION = "leaderboards.manage";

export async function recomputeLeaderboardAction(input: {
  period: "daily" | "weekly" | "monthly" | "all_time";
  metric: "deposits" | "referrals" | "spins";
  finalize?: boolean;
}): Promise<AdminActionResult> {
  const auth = await authorize(PERMISSION);
  if ("error" in auth) return { ok: false, error: auth.error };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("compute_leaderboard", {
    p_period: input.period,
    p_metric: input.metric,
    p_key: null,
    p_finalize: input.finalize ?? false,
  });

  if (error) {
    if (isMissingRelation(error)) return { ok: false, error: RUN_ADMIN_SQL_HINT };
    return { ok: false, error: error.message };
  }

  await writeAudit({
    actorId: auth.staff.userId,
    action: "leaderboard.recompute",
    entityType: "leaderboard",
    entityId: `${input.period}:${input.metric}`,
    after: { rowsWritten: data },
  });

  revalidatePath("/admin/leaderboards");
  return { ok: true, message: `Recomputed ${input.period} ${input.metric} leaderboard — ${data ?? 0} rows.` };
}
