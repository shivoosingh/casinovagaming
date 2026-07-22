import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { BlogPostCard } from "@/components/marketing/blog-post-card";
import type { MarketingPost } from "@/lib/data/marketing";

export function HomeGuides({ posts }: { posts: MarketingPost[] }) {
  if (!posts.length) return null;
  const featured = posts.slice(0, 6);

  return (
    <section aria-labelledby="guides-heading" className="mx-auto max-w-7xl scroll-mt-24 px-4 sm:px-6">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-violet-300">
            Guides &amp; tips
          </p>
          <h2 id="guides-heading" className="mt-1 text-3xl font-bold text-white sm:text-4xl">
            Learn the games, win more
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-400 sm:text-base">
            How-to guides, game comparisons and winning strategies for every game we offer.
          </p>
        </div>
        <Link
          href="/blog"
          className="inline-flex items-center gap-1.5 rounded-xl border border-violet-400/25 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition-colors hover:border-fuchsia-400/40"
        >
          All guides <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {featured.map((post) => (
          <BlogPostCard key={post.id} post={post} />
        ))}
      </div>
    </section>
  );
}
