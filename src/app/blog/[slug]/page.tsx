import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { BlogCoverImage } from "@/components/marketing/blog-cover-image";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { resolveBlogCoverUrl } from "@/lib/blog-cover";
import { getBlogPost, getPublishedBlogPosts, getPublishedBlogSlugs } from "@/lib/data/marketing";
import { SITE_NAME } from "@/lib/constants";
import { ArticleSchema, FaqSchema } from "@/lib/seo/json-ld";
import { findGameForPost } from "@/lib/seo/game-match";
import { BlogCta } from "@/components/marketing/blog-cta";
import { BlogGameCard } from "@/components/marketing/blog-game-card";
import { SignupStickyBar } from "@/components/marketing/signup-sticky-bar";
import { RelatedPosts, rankRelatedPosts } from "@/components/marketing/related-posts";
import { autolinkGames } from "@/lib/seo/autolink";
import { QuickAnswer } from "@/components/marketing/quick-answer";
import { ScrollSignupPrompt } from "@/components/marketing/scroll-signup-prompt";
import { renderBlogBody } from "@/lib/blog/markdown";
import { extractFaqs } from "@/lib/blog/faq";
import { withPromoStrip } from "@/lib/blog/promo-strip";

// ISR: posts are inserted by the admin UI (which calls revalidatePath) or by SQL
// batches (which hit /api/revalidate). 5 minutes bounds staleness either way.
export const revalidate = 300;
export const dynamicParams = true;

export async function generateStaticParams() {
  const slugs = await getPublishedBlogSlugs();
  return slugs.map((slug) => ({ slug }));
}

/** Blog pages have no title template, so add the brand unless the stored title already has it. */
function pageTitle(raw: string): string {
  const t = raw.trim();
  if (t.toLowerCase().includes(SITE_NAME.toLowerCase())) return t;
  return `${t} | ${SITE_NAME}`;
}

/** Only emit dateModified when it is a real edit, not the insert timestamp. */
function modifiedAfterPublish(published?: string | null, updated?: string | null): string | undefined {
  if (!published || !updated) return undefined;
  const p = new Date(published).getTime();
  const u = new Date(updated).getTime();
  if (!Number.isFinite(p) || !Number.isFinite(u)) return undefined;
  return u - p > 60_000 ? updated : undefined;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) return { title: "Post not found", robots: { index: false, follow: false } };
  const title = pageTitle(post.seo_title ?? post.title);
  const description = post.seo_description ?? post.excerpt ?? undefined;
  const image = resolveBlogCoverUrl(post.slug, post.cover_image_url) ?? "/logo.webp";
  const modifiedTime = modifiedAfterPublish(post.published_at, post.updated_at);
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
      ...(modifiedTime ? { modifiedTime } : {}),
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

function formatDate(iso: string | null | undefined) {
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
  const game = findGameForPost(post);
  const ctaSource = `blog_${post.slug}`;

  // Legacy seed posts are markdown; newer posts are HTML. Render either, then
  // pull the FAQ out for schema, add one bonus strip, and autolink game names last
  // (autolink skips text already inside <a>, including the strip's button).
  const rawBody = post.content?.trim() ? post.content : (post.excerpt ?? "");
  const isThin = (post.content ?? "").trim().length < 200;
  const rendered = renderBlogBody(rawBody);
  const faqs = extractFaqs(rendered);
  const contentHtml = autolinkGames(withPromoStrip(rendered, ctaSource));
  const modified = modifiedAfterPublish(post.published_at, post.updated_at);

  const allPosts = await getPublishedBlogPosts();
  const relatedPosts = rankRelatedPosts(allPosts, post);

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
            updatedAt={modified}
          />
          <FaqSchema items={faqs} />
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
              <p className="text-sm text-slate-500">
                <time dateTime={post.published_at}>{formatDate(post.published_at)}</time>
                {modified && (
                  <>
                    {" "}
                    <span aria-hidden>·</span> Updated{" "}
                    <time dateTime={modified}>{formatDate(modified)}</time>
                  </>
                )}
              </p>
            )}
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">{post.title}</h1>
            {post.excerpt && <p className="mt-4 text-lg text-slate-400">{post.excerpt}</p>}
          </header>

          {!isThin && <QuickAnswer text={post.excerpt} />}

          <div
            className="prose prose-invert max-w-none prose-headings:text-white prose-p:text-slate-300 prose-a:text-violet-300 prose-strong:text-white prose-th:text-white prose-td:text-slate-300"
            dangerouslySetInnerHTML={{ __html: contentHtml }}
          />

          {game && <BlogGameCard game={game} />}
          <BlogCta source={ctaSource} variant="feature" />
        </article>

        <RelatedPosts posts={relatedPosts} />
      </main>
      <SignupStickyBar source={ctaSource} />
      <ScrollSignupPrompt source={ctaSource} />
      <Footer />
    </>
  );
}
