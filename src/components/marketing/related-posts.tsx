import { BlogPostCard } from "@/components/marketing/blog-post-card";
import type { MarketingPost } from "@/lib/data/marketing";

/**
 * Rank other posts by relevance to the current one: more shared tags = closer,
 * with newer posts breaking ties. Excludes the current post.
 */
export function rankRelatedPosts(
  all: MarketingPost[],
  current: { slug: string; tags?: string[] | null },
  limit = 3
): MarketingPost[] {
  const currentTags = new Set((current.tags ?? []).map((t) => t.toLowerCase()));
  return all
    .filter((p) => p.slug !== current.slug)
    .map((p) => {
      const shared = (p.tags ?? []).filter((t) => currentTags.has(t.toLowerCase())).length;
      return { post: p, shared, at: p.published_at ? Date.parse(p.published_at) : 0 };
    })
    .sort((a, b) => b.shared - a.shared || b.at - a.at)
    .slice(0, limit)
    .map((x) => x.post);
}

export function RelatedPosts({ posts }: { posts: MarketingPost[] }) {
  if (posts.length === 0) return null;
  return (
    <section className="mx-auto mt-14 max-w-3xl border-t border-white/10 px-4 pt-10 sm:px-6 lg:px-8">
      <h2 className="mb-6 text-lg font-black tracking-tight text-white sm:text-xl">
        Keep reading
      </h2>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <BlogPostCard key={post.slug} post={post} />
        ))}
      </div>
    </section>
  );
}
