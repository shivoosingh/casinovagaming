import type { Metadata } from "next";
import { AdminModulePlaceholder } from "@/components/admin/admin-module-placeholder";

export const metadata: Metadata = { title: "Settings" };

export default function AdminSettingsPage() {
  return (
    <AdminModulePlaceholder
      title="Settings"
      description="Site settings and feature toggles."
    />
  );
}
