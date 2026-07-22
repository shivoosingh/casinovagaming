import type { Metadata } from "next";

import { CmsAnnouncementsPanel } from "@/components/admin/cms-announcements-panel";
import { CmsBlogPanel } from "@/components/admin/cms-blog-panel";
import { CmsTabNav, type CmsTabKey } from "@/components/admin/cms-tab-nav";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { adminDb } from "@/lib/actions/admin/core";
import { requirePermission } from "@/lib/data/admin";

export const metadata: Metadata = { title: "CMS" };
/** Gemini + image generation can take ~30–60s on free APIs */
export const maxDuration = 60;

export default async function AdminCmsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  await requirePermission("cms.manage");
  const params = await searchParams;
  const tab: CmsTabKey = params.tab === "announcements" ? "announcements" : "blog";
  const db = adminDb();

  const [{ data: posts }, { data: announcements }] = await Promise.all([
    db
      .from("blog_posts")
      .select(
        "id, slug, title, excerpt, content, is_published, published_at, seo_title, seo_description, cover_image_url"
      )
      .order("created_at", { ascending: false })
      .limit(100),
    db
      .from("announcements")
      .select("id, title, content, type, is_active, created_at")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  return (
    <div className="mx-auto max-w-7xl">
      <AdminPageHeader
        title="Content Management"
        description="Manage blog posts and site announcements stored in Casinova Supabase tables."
      />

      <CmsTabNav active={tab} />

      {tab === "blog" ? (
        <CmsBlogPanel posts={posts ?? []} />
      ) : (
        <CmsAnnouncementsPanel announcements={announcements ?? []} />
      )}
    </div>
  );
}
