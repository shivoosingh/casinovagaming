import type { Metadata } from "next";
import { BookOpen } from "lucide-react";

import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { BlogPostCard } from "@/components/marketing/blog-post-card";
import { getPublishedBlogPosts } from "@/lib/data/marketing";
import { SITE_NAME } from "@/lib/constants";

export const revalidate = 300;

export const metadata: Metadata = {
  title: `Game Guides, Bonuses & Tips | ${SITE_NAME} Blog`,
  description: `How-to guides on games, deposits, bonuses and VIP rewards at ${SITE_NAME}.`,
  alternates: { canonical: "/blog" },
};

export default async function BlogPage() {
  const posts = await getPublishedBlogPosts();

  return (
    <>
      <Navbar />
      <main className="bg-[#09090F] pb-16 pt-24 text-[#F5F3FF]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Blog" }]} />

          <div className="mb-12 max-w-3xl">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-violet-300">
              Guides &amp; Tips
            </p>
            <h1 className="mb-4 text-4xl font-black tracking-tight">
              Game Guides,{" "}
              <span className="bg-gradient-to-r from-sky-400 via-fuchsia-400 to-violet-400 bg-clip-text text-transparent">
                Bonuses &amp; Tips
              </span>
            </h1>
            <p className="text-lg text-slate-400">
              Everything you need to know about playing at {SITE_NAME} — account setup,
              deposits, bonuses, and VIP.
            </p>
          </div>

          {posts.length === 0 ? (
            <div className="rounded-2xl border border-violet-400/20 bg-[rgba(18,14,34,0.7)] py-20 text-center text-slate-400">
              <BookOpen className="mx-auto mb-4 h-12 w-12 opacity-50" />
              <p className="font-medium text-white">Game guides coming soon</p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <BlogPostCard key={post.id} post={post} dateFormat="long" />
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
