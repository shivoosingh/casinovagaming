"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { track } from "@vercel/analytics";

/**
 * Captures blog→signup attribution on the register page.
 *
 * Reads `src` / UTM params and stores them in a first-party cookie (90 days)
 * plus localStorage, then fires a `register_landed` analytics event so the
 * funnel (which blog post drove the signup visit) is measurable. Renders
 * nothing. Does NOT touch `ref` — that is the referral-code field.
 */
export function SignupAttribution() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const src = searchParams.get("src");
    const utmSource = searchParams.get("utm_source");
    const utmCampaign = searchParams.get("utm_campaign");
    if (!src && !utmSource) return;

    const payload = JSON.stringify({
      src,
      utm_source: utmSource,
      utm_campaign: utmCampaign,
      at: new Date().toISOString(),
    });

    try {
      document.cookie = `cvg_src=${encodeURIComponent(payload)};path=/;max-age=${60 * 60 * 24 * 90};samesite=lax`;
    } catch {
      // ignore
    }
    try {
      localStorage.setItem("cvg_src", payload);
    } catch {
      // ignore
    }
    try {
      track("register_landed", { src: src ?? "direct", campaign: utmCampaign ?? "" });
    } catch {
      // ignore
    }
  }, [searchParams]);

  return null;
}
