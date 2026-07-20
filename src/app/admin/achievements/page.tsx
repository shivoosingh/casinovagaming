import type { Metadata } from "next";
import { AdminModulePlaceholder } from "@/components/admin/admin-module-placeholder";

export const metadata: Metadata = { title: "Achievements" };

export default function AdminAchievementsPage() {
  return (
    <AdminModulePlaceholder
      title="Achievements"
      description="Achievement catalog and unlock rules."
    />
  );
}
