import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";

import { BlogCoverImage } from "@/components/marketing/blog-cover-image";
import { resolveBlogCoverUrl } from "@/lib/blog-cover";
import type { MarketingPost } from "@/lib/data/marketing";

type BlogPostCardProps = {
  post: MarketingPost;
  dateFormat?: "short" | "long";
};

function formatDate(iso: string | null, style: "short" | "long") {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(
    "en-US",
    style === "long"
      ? { month: "long", day: "numeric", year: "numeric" }
      : { month: "short", day: "numeric", year: "numeric" }
  );
}

export function BlogPostCard({ post, dateFormat = "short" }: BlogPostCardProps) {
  const cover = resolveBlogCoverUrl(post.slug, post.cover_image_url);

  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-violet-400/20 bg-[rgba(18,14,34,0.75)] transition-all hover:-translate-y-1 hover:border-fuchsia-400/40 hover:shadow-[0_0_28px_rgba(168,85,247,0.25)]"
    >
      <div className="relative h-36 w-full overflow-hidden bg-[#12101c] sm:h-40 md:h-44">
        {cover ? (
          <BlogCoverImage src={cover} alt={post.title} variant="card" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <BookOpen className="h-10 w-10 text-white/15" aria-hidden />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <h2 className="line-clamp-2 text-base font-bold text-white transition-colors group-hover:text-fuchsia-300">
          {post.title}
        </h2>
        {post.excerpt && (
          <p className="line-clamp-2 flex-1 text-sm text-slate-400">{post.excerpt}</p>
        )}
        <div className="mt-auto flex items-center justify-between pt-2">
          {post.published_at && (
            <time dateTime={post.published_at} className="text-xs text-slate-500">
              {formatDate(post.published_at, dateFormat)}
            </time>
          )}
          <span className="inline-flex items-center gap-1 text-xs font-medium text-violet-300">
            Read more <ArrowRight className="size-3" aria-hidden />
          </span>
        </div>
      </div>
    </Link>
  );
}
