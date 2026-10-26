"use client";

import { FacebookAuthButton } from "@/components/auth/facebook-auth-button";
import { GoogleAuthButton } from "@/components/auth/google-auth-button";

export function SocialAuthButtons({
  redirect = "/dashboard",
  referralCode,
}: {
  redirect?: string;
  referralCode?: string | null;
}) {
  return (
    <div className="space-y-2">
      <GoogleAuthButton redirect={redirect} referralCode={referralCode} />
      <FacebookAuthButton redirect={redirect} referralCode={referralCode} />
      <div className="flex items-center gap-3 py-1">
        <div className="h-px flex-1 bg-white/10" />
        <span className="text-[11px] uppercase tracking-wider text-[#6b6d8f]">or email</span>
        <div className="h-px flex-1 bg-white/10" />
      </div>
    </div>
  );
}
