import type { MetadataRoute } from "next";
import { SITE_URL, PUBLIC_ROUTES } from "@/lib/constants";
import { GAMES } from "@/lib/games";
import { getGameSitemapPriority } from "@/lib/seo/game-seo";
import { allGeoStateSlugs, allGeoCityParams } from "@/lib/data/marketing";
import { createStaticClient } from "@/lib/supabase/static";

export const revalidate = 3600;

const BLOG_PAGE_SIZE = 200;
/** Upper bound on pages fetched, so a bad response cannot loop forever. */
const BLOG_MAX_PAGES = 50;

type SitemapBlogPost = {
  slug: string;
  lastModified?: Date;
};

function validDate(value: string | null | undefined): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : undefined;
}

/** Published posts only, with their real dates. Never falls back to placeholder posts. */
async function getSitemapBlogPosts(): Promise<SitemapBlogPost[]> {
  const supabase = createStaticClient();
  const posts: SitemapBlogPost[] = [];

  for (let page = 0; page < BLOG_MAX_PAGES; page++) {
    const from = page * BLOG_PAGE_SIZE;
    const { data, error } = await supabase
      .from("blog_posts")
      .select("slug, published_at, updated_at")
      .or("is_published.eq.true,status.eq.published")
      .order("published_at", { ascending: false })
      .order("id", { ascending: true })
      .range(from, from + BLOG_PAGE_SIZE - 1);

    if (error) throw new Error(error.message);
    const rows = (data ?? []) as { slug: string | null; published_at: string | null; updated_at: string | null }[];

    for (const row of rows) {
      const slug = row.slug?.trim();
      if (!slug) continue;
      posts.push({ slug, lastModified: validDate(row.updated_at) ?? validDate(row.published_at) });
    }

    if (rows.length < BLOG_PAGE_SIZE) return posts;
  }

  console.error(`[sitemap] blog posts exceeded ${BLOG_PAGE_SIZE * BLOG_MAX_PAGES} rows; the rest were not listed`);
  return posts;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let blogPosts: SitemapBlogPost[] = [];
  try {
    blogPosts = await getSitemapBlogPosts();
  } catch (err) {
    console.error("[sitemap] blog posts query failed:", err instanceof Error ? err.message : err);
  }

  const newestBlogDate = blogPosts.reduce<Date | undefined>(
    (newest, post) =>
      post.lastModified && (!newest || post.lastModified > newest) ? post.lastModified : newest,
    undefined
  );

  // Geo landing pages ([state] and [state]/[city]) are statically generated and
  // indexable, so they belong in the sitemap. Independent queries, so resolve
  // them together; a failure must not drop the rest of the sitemap.
  let stateSlugs: string[] = [];
  let cityParams: { state: string; city: string }[] = [];
  try {
    [stateSlugs, cityParams] = await Promise.all([allGeoStateSlugs(), allGeoCityParams()]);
  } catch (err) {
    console.error("[sitemap] geo pages query failed:", err instanceof Error ? err.message : err);
  }

  const staticRoutes: MetadataRoute.Sitemap = PUBLIC_ROUTES.map((route) => ({
    url: `${SITE_URL}${route.path}`,
    ...(route.path === "/blog" && newestBlogDate ? { lastModified: newestBlogDate } : {}),
    changeFrequency: route.path === "/" ? ("daily" as const) : ("weekly" as const),
    priority: route.priority,
  }));

  const gameRoutes: MetadataRoute.Sitemap = GAMES.filter((g) => !g.upcoming).map((game) => ({
    url: `${SITE_URL}/games/${game.slug}`,
    changeFrequency: "weekly" as const,
    priority: getGameSitemapPriority(game),
  }));

  const blogRoutes: MetadataRoute.Sitemap = blogPosts.map((post) => ({
    url: `${SITE_URL}/blog/${encodeURIComponent(post.slug)}`,
    ...(post.lastModified ? { lastModified: post.lastModified } : {}),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  // No lastModified: geo content has no reliable per-page date, and an always-now
  // lastmod teaches crawlers to distrust the field across the whole sitemap.
  const stateRoutes: MetadataRoute.Sitemap = stateSlugs.map((slug) => ({
    url: `${SITE_URL}/${encodeURIComponent(slug)}`,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  const cityRoutes: MetadataRoute.Sitemap = cityParams.map(({ state, city }) => ({
    url: `${SITE_URL}/${encodeURIComponent(state)}/${encodeURIComponent(city)}`,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  const seen = new Set<string>();
  return [...staticRoutes, ...gameRoutes, ...blogRoutes, ...stateRoutes, ...cityRoutes].filter((entry) => {
    if (seen.has(entry.url)) return false;
    seen.add(entry.url);
    return true;
  });
}
