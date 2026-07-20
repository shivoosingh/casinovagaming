import type { Metadata } from "next";
import { AdminModulePlaceholder } from "@/components/admin/admin-module-placeholder";

export const metadata: Metadata = { title: "Games" };

export default function AdminGamesPage() {
  return (
    <AdminModulePlaceholder
      title="Games"
      description="Game catalog and server configs."
    />
  );
}
