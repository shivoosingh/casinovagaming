import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminSqlRequiredNotice } from "@/components/admin/admin-sql-required-notice";
import {
  EntityEditDialog,
  type FieldValue,
} from "@/components/admin/entity-edit-dialog";
import { Button } from "@/components/ui/button";
import { adminDb, isMissingRelation } from "@/lib/actions/admin/core";
import {
  deletePaymentMethodAction,
  upsertPaymentMethodAction,
} from "@/lib/actions/admin/payments";
import { requirePermission } from "@/lib/data/admin";

export const metadata: Metadata = { title: "Payment Methods" };
export const dynamic = "force-dynamic";

type PaymentMethod = {
  id: string;
  key: string;
  label: string;
  kind: string | null;
  handle: string | null;
  handle_label: string | null;
  pay_link: string | null;
  qr_image_url: string | null;
  instructions: string | null;
  sort_order: number | null;
  is_active: boolean | null;
};

const KIND_OPTIONS = [
  { value: "handle", label: "Handle (CashApp / PayPal / Venmo / Chime)" },
  { value: "crypto", label: "Crypto address (BTC / USDT)" },
  { value: "link", label: "Link only" },
];

function fieldsFor(m?: PaymentMethod) {
  return [
    {
      name: "key",
      label: "Key (unique id, e.g. cashapp)",
      type: "text" as const,
      defaultValue: m?.key ?? "",
      hint: "Lowercase letters and hyphens only",
    },
    { name: "label", label: "Label (tab name)", type: "text" as const, defaultValue: m?.label ?? "" },
    {
      name: "kind",
      label: "Type",
      type: "select" as const,
      defaultValue: m?.kind ?? "handle",
      options: KIND_OPTIONS,
    },
    {
      name: "handle_label",
      label: "Handle label",
      type: "text" as const,
      defaultValue: m?.handle_label ?? "",
    },
    { name: "handle", label: "Handle / address / email", type: "text" as const, defaultValue: m?.handle ?? "" },
    {
      name: "pay_link",
      label: "Pay link (optional)",
      type: "text" as const,
      defaultValue: m?.pay_link ?? "",
    },
    {
      name: "qr_image_url",
      label: "QR image URL (optional)",
      type: "text" as const,
      defaultValue: m?.qr_image_url ?? "",
      hint: "Upload QR to Supabase Storage (cms-media) or use /payments/your.png, then paste URL",
    },
    {
      name: "instructions",
      label: "Instructions (optional)",
      type: "textarea" as const,
      defaultValue: m?.instructions ?? "",
    },
    { name: "sort_order", label: "Sort order", type: "number" as const, defaultValue: m?.sort_order ?? 0 },
    { name: "is_active", label: "Active (shown to players)", type: "switch" as const, defaultValue: m?.is_active ?? true },
  ];
}

function mapValues(v: Record<string, FieldValue>, id?: string) {
  return {
    id,
    key: String(v.key),
    label: String(v.label),
    kind: String(v.kind),
    handle: String(v.handle ?? ""),
    handle_label: String(v.handle_label ?? ""),
    pay_link: String(v.pay_link ?? ""),
    qr_image_url: String(v.qr_image_url ?? ""),
    instructions: String(v.instructions ?? ""),
    sort_order: Number(v.sort_order) || 0,
    is_active: Boolean(v.is_active),
  };
}

export default async function AdminPaymentsPage() {
  await requirePermission("cms.manage");
  const db = adminDb();
  const { data, error } = await db.from("payment_methods").select("*").order("sort_order");

  if (error && isMissingRelation(error)) {
    return (
      <div className="mx-auto max-w-3xl">
        <AdminPageHeader title="Payment Methods" description="Deposit options for players" />
        <AdminSqlRequiredNotice title="Payment Methods need the admin SQL" />
        <p className="mt-3 text-sm text-slate-400">
          Also run <code className="text-violet-300">admin-payments-settings-upgrade.sql</code> after
          essentials for full columns (QR, pay link, kind).
        </p>
      </div>
    );
  }
  if (error) throw new Error(error.message);

  const methods = (data ?? []) as PaymentMethod[];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <AdminPageHeader
        title="Payment Methods"
        description="Add, edit, hide, or delete deposit options — changes go live immediately"
      />

      <EntityEditDialog
        title="Add payment method"
        triggerLabel="Add payment method"
        fields={fieldsFor()}
        action={async (v) => {
          "use server";
          return upsertPaymentMethodAction(mapValues(v));
        }}
      />

      {methods.length === 0 ? (
        <p className="text-sm text-slate-500">No payment methods yet — add one above (or run the upgrade SQL to seed defaults).</p>
      ) : (
        <div className="space-y-3">
          {methods.map((m) => (
            <div
              key={m.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-violet-400/25 bg-[rgba(18,14,34,0.72)] p-4"
            >
              <div className="min-w-0">
                <p className="flex items-center gap-2 font-semibold text-white">
                  {m.label}
                  {!m.is_active && (
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase text-slate-400">
                      Hidden
                    </span>
                  )}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {m.handle_label ? `${m.handle_label}: ` : ""}
                  {m.handle ?? "—"}
                  {m.pay_link ? " · link ✓" : ""}
                  {m.qr_image_url ? " · QR ✓" : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <EntityEditDialog
                  title={`Edit — ${m.label}`}
                  triggerLabel="Edit"
                  fields={fieldsFor(m)}
                  action={async (v) => {
                    "use server";
                    return upsertPaymentMethodAction(mapValues(v, m.id));
                  }}
                />
                <form
                  action={async () => {
                    "use server";
                    await deletePaymentMethodAction(m.id);
                  }}
                >
                  <Button type="submit" size="sm" variant="outline" className="border-red-500/40 text-red-300">
                    Delete
                  </Button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
