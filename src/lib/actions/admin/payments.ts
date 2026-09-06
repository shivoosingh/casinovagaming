"use server";

import { revalidatePath } from "next/cache";
import { adminDb, authorize, writeAudit, type AdminActionResult } from "./core";

export async function upsertPaymentMethodAction(input: {
  id?: string;
  key: string;
  label: string;
  kind?: string;
  handle?: string;
  handle_label?: string;
  pay_link?: string;
  qr_image_url?: string;
  instructions?: string;
  sort_order?: number;
  is_active?: boolean;
}): Promise<AdminActionResult> {
  const auth = await authorize("cms.manage");
  if ("error" in auth) return { ok: false, error: auth.error };

  const key = input.key.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
  const label = input.label.trim();
  if (key.length < 2 || label.length < 2) return { ok: false, error: "Key and label required." };

  const row = {
    key,
    label,
    kind: input.kind || "handle",
    handle: input.handle?.trim() || null,
    handle_label: input.handle_label?.trim() || null,
    pay_link: input.pay_link?.trim() || null,
    qr_image_url: input.qr_image_url?.trim() || null,
    instructions: input.instructions?.trim() || null,
    sort_order: Number(input.sort_order) || 0,
    is_active: input.is_active !== false,
    updated_by: auth.staff.userId,
    updated_at: new Date().toISOString(),
  };

  const db = adminDb();
  const { error } = input.id
    ? await db.from("payment_methods").update(row).eq("id", input.id)
    : await db.from("payment_methods").insert(row);

  if (error) {
    return {
      ok: false,
      error: /duplicate|unique/i.test(error.message)
        ? "A method with that key already exists."
        : error.message,
    };
  }

  await writeAudit({
    actorId: auth.staff.userId,
    action: input.id ? "payment_method.update" : "payment_method.create",
    entityType: "payment_method",
    entityId: input.id ?? key,
    after: row,
  });

  revalidatePath("/admin/payments");
  revalidatePath("/dashboard/deposit");
  revalidatePath("/dashboard/deposits");
  revalidatePath("/games", "layout");
  return { ok: true, message: "Payment method saved." };
}

export async function deletePaymentMethodAction(id: string): Promise<AdminActionResult> {
  const auth = await authorize("cms.manage");
  if ("error" in auth) return { ok: false, error: auth.error };
  const { error } = await adminDb().from("payment_methods").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  await writeAudit({
    actorId: auth.staff.userId,
    action: "payment_method.delete",
    entityType: "payment_method",
    entityId: id,
  });
  revalidatePath("/admin/payments");
  revalidatePath("/dashboard/deposit");
  revalidatePath("/dashboard/deposits");
  revalidatePath("/games", "layout");
  return { ok: true, message: "Deleted." };
}

/** Upload a CashApp/BTC QR (or tag screenshot) to cms-media and optionally attach to a method. */
export async function uploadPaymentQrAction(formData: FormData): Promise<AdminActionResult & { url?: string }> {
  const auth = await authorize("cms.manage");
  if ("error" in auth) return { ok: false, error: auth.error };

  const file = formData.get("file");
  const methodId = String(formData.get("methodId") || "").trim();
  if (!(file instanceof File) || file.size < 1) {
    return { ok: false, error: "Choose an image file." };
  }
  if (!file.type.startsWith("image/")) {
    return { ok: false, error: "File must be an image." };
  }
  if (file.size > 5 * 1024 * 1024) {
    return { ok: false, error: "Image must be under 5MB." };
  }

  const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
  const path = `payments/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  const db = adminDb();

  const { error: uploadError } = await db.storage.from("cms-media").upload(path, bytes, {
    contentType: file.type || "image/png",
    upsert: true,
  });
  if (uploadError) return { ok: false, error: uploadError.message };

  const { data: pub } = db.storage.from("cms-media").getPublicUrl(path);
  const url = pub.publicUrl;

  if (methodId) {
    const { error } = await db
      .from("payment_methods")
      .update({
        qr_image_url: url,
        updated_by: auth.staff.userId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", methodId);
    if (error) return { ok: false, error: error.message };

    await writeAudit({
      actorId: auth.staff.userId,
      action: "payment_method.qr_upload",
      entityType: "payment_method",
      entityId: methodId,
      after: { qr_image_url: url },
    });

    revalidatePath("/admin/payments");
    revalidatePath("/dashboard/deposit");
    revalidatePath("/dashboard/deposits");
    revalidatePath("/games", "layout");
  }

  return { ok: true, message: "QR image uploaded.", url };
}

export async function updateSettingAction(input: {
  key: string;
  value: unknown;
}): Promise<AdminActionResult> {
  const auth = await authorize("settings.manage");
  if ("error" in auth) return { ok: false, error: auth.error };
  const key = input.key.trim();
  if (!key) return { ok: false, error: "Key required." };

  const { error } = await adminDb().from("site_settings").upsert({
    key,
    value: input.value as object,
    updated_by: auth.staff.userId,
    updated_at: new Date().toISOString(),
  });
  if (error) return { ok: false, error: error.message };

  await writeAudit({
    actorId: auth.staff.userId,
    action: "setting.update",
    entityType: "site_setting",
    entityId: key,
    after: input.value,
  });
  revalidatePath("/admin/settings");
  return { ok: true, message: "Setting saved." };
}
