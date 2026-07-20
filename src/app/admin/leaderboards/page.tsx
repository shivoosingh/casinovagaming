import type { Metadata } from "next";
import { AdminModulePlaceholder } from "@/components/admin/admin-module-placeholder";

export const metadata: Metadata = { title: "Leaderboards" };

export default function AdminLeaderboardsPage() {
  return (
    <AdminModulePlaceholder
      title="Leaderboards"
      description="Leaderboard windows and recomputation."
    />
  );
}
