"use server";

import { createClient } from "@/lib/supabase/server";
import { attachSignupReferral } from "@/lib/rewards/attach-referral";

/** Called after email confirm when the link still has ?ref= */
export async function claimSignupReferral(rawCode: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await attachSignupReferral(user.id, rawCode);
}
