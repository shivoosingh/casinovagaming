import type { Metadata } from "next";
import { AdminModulePlaceholder } from "@/components/admin/admin-module-placeholder";

export const metadata: Metadata = { title: "Geo Pages" };

export default function AdminGeoPage() {
  return (
    <AdminModulePlaceholder
      title="Geo Pages"
      description="State and city landing pages."
    />
  );
}
