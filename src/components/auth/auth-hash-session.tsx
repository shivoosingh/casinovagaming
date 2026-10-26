"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Recover sessions when Supabase email links dump #access_token on `/` or other pages
 * (happens when redirect URL was not allow-listed and Site URL was used instead).
 */
export function AuthHashSession() {
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash || !hash.includes("access_token")) return;

    const params = new URLSearchParams(hash.replace(/^#/, ""));
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");
    if (!access_token || !refresh_token) return;

    const supabase = createClient();
    if (!supabase) return;

    let cancelled = false;
    void (async () => {
      const { error } = await supabase.auth.setSession({ access_token, refresh_token });
      if (cancelled) return;
      const url = new URL(window.location.href);
      url.hash = "";
      if (error) {
        url.pathname = "/login";
        url.searchParams.set("error", "auth_callback_failed");
      } else {
        url.pathname = "/dashboard";
        url.searchParams.set("verified", "1");
      }
      window.location.replace(url.toString());
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
