"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ADMIN_MODULES } from "@/lib/data/admin-modules";

export function AdminRoutePrefetch() {
  const router = useRouter();

  useEffect(() => {
    for (const href of ADMIN_MODULES.map((m) => m.href)) {
      router.prefetch(href);
    }
  }, [router]);

  return null;
}
