import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { BlogCoverImage } from "@/components/marketing/blog-cover-image";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { resolveBlogCoverUrl } from "@/lib/blog-cover";
import { getBlogPost, getPublishedBlogPosts } from "@/lib/data/marketing";
import { SITE_NAME } from "@/lib/constants";
import { ArticleSchema } from "@/lib/seo/json-ld";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) return { title: "Post not found" };
  const title = post.seo_title ?? post.title;
  const description = post.seo_description ?? post.excerpt ?? undefined;
  const image = resolveBlogCoverUrl(post.slug, post.cover_image_url) ?? "/logo.webp";
  return {
    title,
    description,
    alternates: { canonical: `/blog/${slug}` },
    openGraph: {
      type: "article",
      url: `/blog/${slug}`,
      title,
      description,
      siteName: SITE_NAME,
      images: [{ url: image, alt: post.title }],
      ...(post.published_at ? { publishedTime: post.published_at } : {}),
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

function formatDate(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) notFound();

  const cover = resolveBlogCoverUrl(post.slug, post.cover_image_url);

  return (
    <>
      <Navbar />
      <main className="bg-[#09090F] pb-16 pt-24 text-[#F5F3FF]">
        <article className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <ArticleSchema
            title={post.title}
            description={post.seo_description ?? post.excerpt}
            slug={post.slug}
            image={cover}
            publishedAt={post.published_at}
          />
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Blog", href: "/blog" },
              { name: post.title },
            ]}
          />

          <Link
            href="/blog"
            className="mb-8 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-violet-200"
          >
            <ArrowLeft className="h-4 w-4" /> Back to blog
          </Link>

          {cover && (
            <div className="relative mb-8 aspect-video w-full overflow-hidden rounded-2xl bg-[#12101c]">
              <BlogCoverImage src={cover} alt={post.title} priority variant="hero" sizes="768px" />
            </div>
          )}

          <header className="mb-8">
            {post.published_at && (
              <time dateTime={post.published_at} className="text-sm text-slate-500">
                {formatDate(post.published_at)}
              </time>
            )}
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">{post.title}</h1>
            {post.excerpt && <p className="mt-4 text-lg text-slate-400">{post.excerpt}</p>}
          </header>

          <div
            className="prose prose-invert max-w-none prose-headings:text-white prose-p:text-slate-300 prose-a:text-violet-300 prose-strong:text-white"
            dangerouslySetInnerHTML={{ __html: post.content ?? post.excerpt ?? "" }}
          />
        </article>
      </main>
      <Footer />
    </>
  );
}
