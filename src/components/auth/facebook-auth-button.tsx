"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface FacebookAuthButtonProps {
  redirect?: string;
  referralCode?: string | null;
  label?: string;
}

export function FacebookAuthButton({
  redirect = "/",
  referralCode,
  label = "Continue with Facebook",
}: FacebookAuthButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    const supabase = createClient();
    if (!supabase) {
      toast.error("Authentication is not configured");
      setLoading(false);
      return;
    }

    const callbackUrl = new URL("/auth/callback", window.location.origin);
    callbackUrl.searchParams.set("redirect", redirect);
    if (referralCode?.trim()) callbackUrl.searchParams.set("ref", referralCode.trim());

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "facebook",
      options: { redirectTo: callbackUrl.toString() },
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    if (data?.url) {
      window.location.href = data.url;
      return;
    }
    toast.error("Could not start Facebook sign-in. Turn on the Facebook provider in Supabase Auth.");
    setLoading(false);
  }

  return (
    <Button type="button" variant="outline" className="w-full gap-2 border-white/20" onClick={handleClick} disabled={loading}>
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <path
          fill="#1877F2"
          d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"
        />
      </svg>
      {loading ? "Redirecting to Facebook..." : label}
    </Button>
  );
}
