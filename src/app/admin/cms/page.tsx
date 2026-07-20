import type { Metadata } from "next";
import { AdminModulePlaceholder } from "@/components/admin/admin-module-placeholder";

export const metadata: Metadata = { title: "CMS" };

export default function AdminCmsPage() {
  return (
    <AdminModulePlaceholder
      title="CMS"
      description="FAQs, banners, announcements, and content blocks."
    />
  );
}
