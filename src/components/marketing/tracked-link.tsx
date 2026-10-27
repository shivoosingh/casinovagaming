"use client";

import Link from "next/link";
import { track } from "@vercel/analytics";
import type { ReactNode } from "react";

/**
 * A next/link that fires a Vercel Analytics custom event on click, then
 * navigates normally. Use for marketing CTAs so clicks are measurable.
 *
 * Note: custom events require Vercel Web Analytics on a paid plan; on the free
 * plan the call is a harmless no-op and navigation still works.
 */
export function TrackedLink({
  href,
  event,
  data,
  className,
  children,
}: {
  href: string;
  event: string;
  data?: Record<string, string | number | boolean>;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={className}
      onClick={() => {
        try {
          track(event, data);
        } catch {
          // analytics must never block navigation
        }
      }}
    >
      {children}
    </Link>
  );
}
