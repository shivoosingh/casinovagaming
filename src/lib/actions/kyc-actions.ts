"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface KYCSubmissionRecord {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  document_name: string;
  document_url: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

function mapRow(row: Record<string, unknown>): KYCSubmissionRecord {
  const status = String(row.status ?? "pending");
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    user_email: String(row.user_email ?? "player@Casinova.local"),
    user_name: String(row.user_name ?? "Player"),
    document_name: String(row.document_name ?? "government_id.jpg"),
    document_url: String(row.document_url ?? ""),
    status:
      status === "verified" || status === "approved"
        ? "approved"
        : status === "rejected"
          ? "rejected"
          : "pending",
    created_at: String(row.created_at ?? new Date().toISOString()),
  };
}

type KycUpload = {
  documentName: string;
  documentDataUrl: string;
};

function validIdPhoto(upload: KycUpload): string | null {
  if (!upload.documentDataUrl.startsWith("data:image/jpeg;base64,")) {
    return "Use a JPG or PNG photo of your ID.";
  }
  if (upload.documentDataUrl.length > 950_000) {
    return "That photo is too large. Try a smaller one.";
  }
  return null;
}

async function saveKycForUser(
  userId: string,
  upload: KycUpload,
  fallbackEmail: string
): Promise<{ ok: boolean; error?: string }> {
  const invalid = validIdPhoto(upload);
  if (invalid) return { ok: false, error: invalid };

  const admin = createAdminClient();
  if (!admin) {
    return { ok: false, error: "Server configuration error. Contact support." };
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("full_name, email")
    .eq("id", userId)
    .maybeSingle();

  const userEmail = profile?.email || fallbackEmail || "player@Casinova.local";
  const userName = profile?.full_name || userEmail.split("@")[0] || "VIP Player";
  const docName = (upload.documentName || "government_id.jpg").slice(0, 120);

  const row = {
    user_id: userId,
    user_email: userEmail,
    user_name: userName,
    document_name: docName,
    document_url: upload.documentDataUrl,
    status: "pending" as const,
    updated_at: new Date().toISOString(),
  };

  const { data: existing, error: existingError } = await admin
    .from("kyc_submissions")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  const write = existing
    ? await admin.from("kyc_submissions").update(row).eq("id", existing.id)
    : await admin.from("kyc_submissions").insert(row);
  const upsertError = existingError || write.error;

  if (upsertError) {
    if (/kyc_submissions|schema cache|does not exist/i.test(upsertError.message)) {
      return {
        ok: false,
        error:
          "KYC database not set up. Admin: run supabase/final-file-features-casinova.sql in Supabase SQL Editor.",
      };
    }
    return { ok: false, error: upsertError.message };
  }

  const { error: profileError } = await admin
    .from("profiles")
    .update({
      kyc_status: "pending",
      kyc_document_url: docName,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (profileError && !/kyc_status|column/i.test(profileError.message)) {
    console.warn("[KYC] profile update:", profileError.message);
  }

  revalidatePath("/dashboard/kyc");
  revalidatePath("/admin/kyc");
  return { ok: true };
}

/** Submit KYC Document (signed-in player) */
export async function submitKYCDocument(upload: KycUpload): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Please log in before submitting KYC." };
  }

  return saveKycForUser(user.id, upload, user.email || "");
}

/** Attach the ID photo collected on the signup form. Only a brand-new account can use this. */
export async function submitSignupIdentity(
  input: KycUpload & { userId: string; email: string }
): Promise<{ ok: boolean; error?: string }> {
  const admin = createAdminClient();
  if (!admin) {
    return { ok: false, error: "Server configuration error. Contact support." };
  }

  const { data, error } = await admin.auth.admin.getUserById(input.userId);
  if (error || !data.user) {
    return { ok: false, error: "Account was not found." };
  }

  const created = new Date(data.user.created_at).getTime();
  if (!Number.isFinite(created) || Date.now() - created > 20 * 60 * 1000) {
    return { ok: false, error: "Sign in and upload your ID under Verify ID." };
  }

  const accountEmail = (data.user.email || "").toLowerCase();
  if (!accountEmail || accountEmail !== input.email.trim().toLowerCase()) {
    return { ok: false, error: "Could not attach this ID to the new account." };
  }

  return saveKycForUser(input.userId, input, accountEmail);
}

/** Check whether KYC tables exist in Supabase */
export async function getKYCSystemStatus(): Promise<{ ready: boolean; error?: string }> {
  const admin = createAdminClient();
  if (!admin) {
    return { ready: false, error: "SUPABASE_SERVICE_ROLE_KEY is missing on the server." };
  }

  const { error } = await admin.from("kyc_submissions").select("id").limit(1);
  if (error) {
    if (/kyc_submissions|schema cache|does not exist/i.test(error.message)) {
      return {
        ready: false,
        error:
          "Run supabase/final-file-features-casinova.sql in the Supabase SQL Editor.",
      };
    }
    return { ready: false, error: error.message };
  }
  return { ready: true };
}

export async function getAdminKYCSubmissions(): Promise<KYCSubmissionRecord[]> {
  const admin = createAdminClient();
  if (!admin) return [];

  const { data, error } = await admin
    .from("kyc_submissions")
    .select("id, user_id, user_email, user_name, document_name, status, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    if (/kyc_submissions|schema cache|does not exist/i.test(error.message)) {
      console.warn("[KYC Admin] Table missing — run kyc_and_ai_system migration");
      return [];
    }
    console.error("[KYC Admin Fetch]", error.message);
    return [];
  }

  const rows = (data ?? []).map((row) => mapRow(row as Record<string, unknown>));
  rows.sort((a, b) => {
    if (a.status === "pending" && b.status !== "pending") return -1;
    if (b.status === "pending" && a.status !== "pending") return 1;
    return a.created_at < b.created_at ? 1 : -1;
  });
  return rows;
}

/** Load one ID photo when an admin opens it. The list stays small without the image. */
export async function getKYCDocumentUrl(
  submissionId: string
): Promise<{ url: string } | { error: string }> {
  const { can, getStaffContext } = await import("@/lib/data/admin");
  const ctx = await getStaffContext();
  if (!ctx || !can(ctx, "cms.manage")) return { error: "Not allowed." };

  const admin = createAdminClient();
  if (!admin) return { error: "Server configuration error." };

  const { data, error } = await admin
    .from("kyc_submissions")
    .select("document_url")
    .eq("id", submissionId)
    .maybeSingle();

  if (error || !data?.document_url) return { error: "Photo not found." };
  return { url: String(data.document_url) };
}

/** Approve or Reject KYC (Admin) — submissionIdOrUserId can be row id or user_id */
export async function updateKYCStatus(
  submissionIdOrUserId: string,
  newStatus: "approved" | "rejected"
): Promise<{ ok: boolean; error?: string }> {
  const { can, getStaffContext } = await import("@/lib/data/admin");
  const ctx = await getStaffContext();
  if (!ctx || !can(ctx, "cms.manage")) return { ok: false, error: "Not allowed." };

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Server configuration error." };

  let submission = (
    await admin.from("kyc_submissions").select("id, user_id").eq("id", submissionIdOrUserId).maybeSingle()
  ).data;

  if (!submission) {
    submission = (
      await admin.from("kyc_submissions").select("id, user_id").eq("user_id", submissionIdOrUserId).maybeSingle()
    ).data;
  }

  if (!submission) {
    return { ok: false, error: "KYC submission not found." };
  }

  const dbStatus = newStatus === "approved" ? "verified" : "rejected";

  const { error: subError } = await admin
    .from("kyc_submissions")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", submission.id);

  if (subError) {
    return { ok: false, error: subError.message };
  }

  const { error: profileError } = await admin
    .from("profiles")
    .update({
      kyc_status: dbStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", submission.user_id);

  if (profileError) {
    return { ok: false, error: profileError.message };
  }

  revalidatePath("/dashboard/kyc");
  revalidatePath("/admin/kyc");
  revalidatePath("/dashboard/withdraw");
  revalidatePath("/games", "layout");
  revalidatePath("/dashboard/wallet");

  return { ok: true };
}

function isKycApproved(status: string | null | undefined): boolean {
  return status === "approved" || status === "verified";
}

/** Block redeem until an admin has approved the player's ID. */
export async function redeemKycBlockReason(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("kyc_status")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    if (/kyc_status|column|schema cache/i.test(error.message)) return null;
    console.error("[kyc] redeem check:", error.message);
    return null;
  }

  const status = data?.kyc_status ?? "unverified";
  if (isKycApproved(status)) return null;
  if (status === "pending") {
    return "Your ID is in review. Redeem opens after we approve it. Check Verify ID in your dashboard.";
  }
  if (status === "rejected") {
    return "Your ID was rejected. Upload a new photo under Verify ID, then redeem again.";
  }
  return "Verify your ID before redeeming. Open Verify ID in your dashboard and upload a photo of your ID.";
}

/** Player dashboard — current KYC status from profile */
export async function getPlayerKYCStatus(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "unverified";

  const { data } = await supabase.from("profiles").select("kyc_status").eq("id", user.id).maybeSingle();
  const status = data?.kyc_status ?? "unverified";
  if (status === "verified") return "approved";
  return status;
}
