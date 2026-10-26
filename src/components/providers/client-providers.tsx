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

export function ClientProviders({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);

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
