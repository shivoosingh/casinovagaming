import { Suspense } from "react";
import type { Metadata } from "next";

import { AdminLayoutGate } from "@/components/admin/admin-layout-gate";
import { AdminLayoutSkeleton } from "@/components/admin/admin-layout-skeleton";
import { AdminRoutePrefetch } from "@/components/admin/admin-route-prefetch";
import AdminLoading from "./loading";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Casinova Admin" },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<AdminLayoutSkeleton />}>
      <AdminRoutePrefetch />
      <AdminLayoutGate>
        <Suspense fallback={<AdminLoading />}>{children}</Suspense>
      </AdminLayoutGate>
    </Suspense>
  );
}
