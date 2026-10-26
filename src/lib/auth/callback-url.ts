/** Canonical production origin (must match Supabase Redirect URL allow-list). */
const PRODUCTION_ORIGIN = "https://casinovasgaming.com";

/**
 * Production email links must use the non-www site origin.
 * Supabase rejects www.casinovasgaming.com redirects and falls back to Site URL `/`,
 * which breaks email verification sessions.
 */
export function getEmailAuthOrigin(requestOrigin: string): string {
  try {
    const host = new URL(requestOrigin).hostname;
    if (host === "localhost" || host === "127.0.0.1") {
      return requestOrigin.replace(/\/$/, "");
    }
  } catch {
    // fall through
  }

  const configured = (process.env.NEXT_PUBLIC_SITE_URL || PRODUCTION_ORIGIN).replace(/\/$/, "");
  try {
    const url = new URL(configured);
    if (url.hostname === "www.casinovasgaming.com" || url.hostname === "casinovasgaming.com") {
      return PRODUCTION_ORIGIN;
    }
    if (url.hostname === "www.casinovagaming.com" || url.hostname === "casinovagaming.com") {
      return PRODUCTION_ORIGIN;
    }
    return `${url.protocol}//${url.host}`;
  } catch {
    return PRODUCTION_ORIGIN;
  }
}

/** Build the OAuth / email-verification callback URL for the current environment */
export function getAuthCallbackUrl(redirect = "/dashboard"): string {
  const origin =
    typeof window !== "undefined"
      ? getEmailAuthOrigin(window.location.origin)
      : getEmailAuthOrigin(process.env.NEXT_PUBLIC_SITE_URL || PRODUCTION_ORIGIN);

  const url = new URL("/auth/callback", origin);
  url.searchParams.set("redirect", redirect.startsWith("/") ? redirect : "/dashboard");
  return url.toString();
}

export function getAuthCallbackUrlWithRef(redirect = "/dashboard", referralCode?: string | null): string {
  const url = new URL(getAuthCallbackUrl(redirect));
  if (referralCode?.trim()) {
    url.searchParams.set("ref", referralCode.trim());
  }
  return url.toString();
}

/** Server-side callback URL (pass request origin from the client in dev) */
export function buildAuthCallbackUrl(
  origin: string,
  redirect = "/dashboard",
  referralCode?: string | null
): string {
  const base = getEmailAuthOrigin(origin);
  const url = new URL("/auth/callback", base);
  url.searchParams.set("redirect", redirect.startsWith("/") ? redirect : "/dashboard");
  if (referralCode?.trim()) {
    url.searchParams.set("ref", referralCode.trim());
  }
  return url.toString();
}
