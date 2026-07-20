import type { Metadata } from "next";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { DEPOSIT_PAYMENT_METHODS } from "@/lib/payments/methods";
import { requirePermission } from "@/lib/data/admin";

export const metadata: Metadata = { title: "Payment Methods" };

const ENV_BY_METHOD: Record<
  string,
  { username: string; link?: string }
> = {
  paypal: { username: "NEXT_PUBLIC_DEPOSIT_PAYPAL" },
  chime: {
    username: "NEXT_PUBLIC_DEPOSIT_CHIME",
    link: "NEXT_PUBLIC_DEPOSIT_CHIME_LINK",
  },
  cashapp: {
    username: "NEXT_PUBLIC_DEPOSIT_CASHAPP",
    link: "NEXT_PUBLIC_DEPOSIT_CASHAPP_LINK",
  },
  bitcoin: { username: "NEXT_PUBLIC_DEPOSIT_BITCOIN" },
  usdt: { username: "NEXT_PUBLIC_DEPOSIT_USDT" },
  venmo: {
    username: "NEXT_PUBLIC_DEPOSIT_VENMO",
    link: "NEXT_PUBLIC_DEPOSIT_VENMO_LINK",
  },
};

export default async function AdminPaymentsPage() {
  await requirePermission("cms.manage");

  return (
    <div className="mx-auto max-w-3xl">
      <AdminPageHeader
        title="Payment Methods"
        description="Deposit options shown on the wallet page — configured in src/lib/payments/methods.ts with optional env overrides."
      />

      <div className="mb-6 rounded-2xl border border-violet-400/20 bg-[rgba(18,14,34,0.5)] p-4 text-sm text-slate-400">
        Override handles and pay links per method using{" "}
        <code className="text-violet-200">NEXT_PUBLIC_DEPOSIT_*</code> variables on Vercel or in{" "}
        <code className="text-violet-200">.env.local</code>. QR images live under{" "}
        <code className="text-violet-200">/public/payments/</code>.
      </div>

      <div className="space-y-3">
        {DEPOSIT_PAYMENT_METHODS.map((m) => {
          const env = ENV_BY_METHOD[m.id];
          return (
            <div
              key={m.id}
              className="rounded-2xl border border-violet-400/25 bg-[rgba(18,14,34,0.72)] p-4"
            >
              <p className="font-semibold text-white">{m.label}</p>
              <p className="mt-1 text-sm text-slate-400">
                {m.copyLabel}: <span className="text-emerald-300">{m.username}</span>
              </p>
              {m.payLink && (
                <p className="mt-1 truncate text-xs text-slate-500">Pay link: {m.payLink}</p>
              )}
              <p className="mt-1 text-xs text-slate-500">QR: {m.qrImage}</p>
              {env && (
                <div className="mt-3 rounded-lg border border-violet-500/15 bg-black/20 p-3 text-xs text-slate-500">
                  <p className="font-medium text-violet-200/80">Env vars</p>
                  <p>
                    <code>{env.username}</code>
                    {env.link ? (
                      <>
                        {" · "}
                        <code>{env.link}</code>
                      </>
                    ) : null}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
