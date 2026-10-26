"use client";

import { useEffect, useState } from "react";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { syncProfileFromAuthMetadata } from "@/lib/actions/auth";
import { linkSignupSecurity } from "@/lib/actions/security";
import { claimSignupReferral } from "@/lib/rewards/claim-signup-referral";

function safeRedirect(raw: string | null): string {
  if (raw && raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return "/dashboard";
}

export default function AuthCallbackPage() {
  const [message, setMessage] = useState("Verifying your email…");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const supabase = createClient();
      if (!supabase) {
        window.location.replace("/login?error=auth_callback_failed");
        return;
      }

      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      const tokenHash = url.searchParams.get("token_hash");
      const rawType = url.searchParams.get("type");
      const type = (rawType === "email" ? "signup" : rawType) as EmailOtpType | null;
      const redirect = safeRedirect(url.searchParams.get("redirect") || url.searchParams.get("next"));
      const referralCode = url.searchParams.get("ref");

      const hashParams = new URLSearchParams(
        url.hash.startsWith("#") ? url.hash.slice(1) : url.hash
      );
      const access_token = hashParams.get("access_token");
      const refresh_token = hashParams.get("refresh_token");
      const hashError = hashParams.get("error_description") || hashParams.get("error");

      try {
        if (hashError) {
          throw new Error(hashError);
        }

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else if (tokenHash) {
          const otpTypes: EmailOtpType[] = type
            ? [type, "signup", "email", "magiclink"]
            : ["signup", "email", "magiclink"];
          let lastError: Error | null = null;
          let ok = false;
          for (const otpType of [...new Set(otpTypes)]) {
            const { error } = await supabase.auth.verifyOtp({
              type: otpType,
              token_hash: tokenHash,
            });
            if (!error) {
              ok = true;
              break;
            }
            lastError = error;
          }
          if (!ok) throw lastError || new Error("OTP verification failed");
        } else if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
          if (error) throw error;
        } else {
          throw new Error("Missing auth credentials in callback URL");
        }

        if (cancelled) return;
        setMessage("Finishing signup…");

        try {
          await syncProfileFromAuthMetadata();
        } catch (err) {
          console.error("auth callback profile sync:", err);
        }

        const hashType = hashParams.get("type");
        const isNewSignup =
          type === "signup" ||
          type === "magiclink" ||
          type === "email" ||
          hashType === "signup" ||
          hashType === "magiclink" ||
          hashType === "email";

        if (isNewSignup) {
          try {
            await linkSignupSecurity();
          } catch (err) {
            console.error("auth callback linkSignupSecurity:", err);
          }
        }

        if (referralCode?.trim()) {
          try {
            await claimSignupReferral(referralCode);
          } catch (err) {
            console.error("auth callback referral:", err);
          }
        }

        const dest = new URL(redirect, window.location.origin);
        dest.searchParams.set("verified", "1");
        window.location.replace(dest.toString());
      } catch (err) {
        console.error("auth callback failed:", err);
        if (!cancelled) {
          window.location.replace("/login?error=auth_callback_failed");
        }
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#09090F] px-4 text-[#F5F3FF]">
      <p className="text-sm text-slate-300">{message}</p>
    </div>
  );
}
