"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

export function SecurityPageClient({ phone }: { phone: string | null }) {
  const [qr, setQr] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  async function startEnroll() {
    const supabase = createClient();
    if (!supabase) return;
    setBusy(true);
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "Casinova" });
    setBusy(false);
    if (error || !data) {
      toast.error(error?.message || "Authenticator setup is not enabled on this project yet.");
      return;
    }
    setFactorId(data.id);
    setQr(data.totp.qr_code);
  }

  async function confirmEnroll() {
    const supabase = createClient();
    if (!supabase || !factorId) return;
    setBusy(true);
    const challenge = await supabase.auth.mfa.challenge({ factorId });
    if (challenge.error || !challenge.data) {
      setBusy(false);
      toast.error(challenge.error?.message || "Could not start verification.");
      return;
    }
    const verified = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.data.id,
      code: code.trim(),
    });
    setBusy(false);
    if (verified.error) {
      toast.error(verified.error.message);
      return;
    }
    toast.success("Authenticator is on. Sign-in will ask for the 6-digit code.");
    setQr(null);
    setCode("");
  }

  return (
    <div>
      <DashboardPageHeader
        title={
          <span className="flex items-center gap-2">
            <ShieldCheck className="h-7 w-7 text-emerald-400" /> Security
          </span>
        }
        description="Your phone is saved at signup. Add an authenticator app if you want a second step at sign-in."
      />
      <div className="max-w-lg space-y-4">
        <section className="rounded-2xl border border-white/10 bg-[#0d0d1f] p-6">
          <p className="text-sm text-[#6b6d8f]">Phone on file</p>
          <p className="mt-1 font-semibold text-white">{phone || "No phone saved"}</p>
        </section>
        <section className="rounded-2xl border border-white/10 bg-[#0d0d1f] p-6">
          <h2 className="font-semibold text-white">Authenticator app</h2>
          <p className="mt-2 text-sm text-[#6b6d8f]">
            Optional. Email and password still work. After this is on, sign-in asks for a 6-digit code.
          </p>
          {!qr ? (
            <Button className="mt-4" disabled={busy} onClick={() => void startEnroll()}>
              {busy ? "Starting…" : "Set up authenticator"}
            </Button>
          ) : (
            <div className="mt-4 space-y-3">
              <img src={qr} alt="Authenticator QR code" className="h-40 w-40 rounded-lg bg-white p-2" />
              <Input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" placeholder="6-digit code" />
              <Button disabled={busy || code.trim().length < 6} onClick={() => void confirmEnroll()}>
                Confirm code
              </Button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
