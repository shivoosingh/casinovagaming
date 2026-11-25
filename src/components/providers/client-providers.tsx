"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Toaster } from "sonner";
import { AuthHashSession } from "@/components/auth/auth-hash-session";
import { MessageRealtimeProvider } from "@/components/chat/message-realtime-provider";
import { createClient } from "@/lib/supabase/client";
import { MessageRealtimeStubProvider } from "@/lib/chat/message-realtime-stub";
import { InstallAppBanner } from "@/components/pwa/install-app-banner";

const REALTIME_ROUTE_PREFIXES = ["/dashboard", "/admin", "/spin"];

function needsRealtimeImmediately(pathname: string | null): boolean {
  if (!pathname) return false;
  return REALTIME_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

/**
 * First guess at "is there a session", read from the Supabase auth cookie
 * before the async session check answers. Null on the server.
 *
 * Why it matters: the provider below is chosen from this value. Starting from
 * "unknown" meant every logged-out visitor first got the realtime provider and
 * was then switched to the stub, and swapping the provider component makes
 * React throw away and rebuild the whole page a second time. With the right
 * first guess the provider never changes, so the page renders once.
 */
function hasSessionCookie(): boolean | null {
  if (typeof document === "undefined") return null;
  return /(?:^|;\s*)sb-[^=;]+-auth-token/.test(document.cookie);
}

export function ClientProviders({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [loggedIn, setLoggedIn] = useState<boolean | null>(hasSessionCookie);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) {
      setLoggedIn(false);
      return;
    }

    void supabase.auth.getSession().then(({ data: { session } }) => {
      setLoggedIn(!!session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const Provider =
    loggedIn === false && !needsRealtimeImmediately(pathname)
      ? MessageRealtimeStubProvider
      : MessageRealtimeProvider;

  return (
    <>
      <AuthHashSession />
      <Provider>{children}</Provider>
      <InstallAppBanner />
      <Toaster richColors closeButton position="top-center" />
    </>
  );
}
