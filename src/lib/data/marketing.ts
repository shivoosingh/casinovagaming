import { createStaticClient } from "@/lib/supabase/static";
import { resolveBlogCoverUrl } from "@/lib/blog-cover";
import { GEO_STATES, type CityData, type StateData } from "@/lib/geo-data";

export type { CityData, StateData };

export type MarketingPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  cover_image_url: string | null;
  tags: string[] | null;
  published_at: string | null;
  seo_title: string | null;
  seo_description: string | null;
};

export type MarketingPostFull = MarketingPost & {
  content: string | null;
};

/** Rewrite legacy Spinora / WinSweeps copy to casinovasgaming. */
function brandText(value: string | null | undefined): string | null {
  if (value == null || value === "") return value ?? null;
  return value
    .replace(/Win\s*Sweeps/gi, "casinovasgaming")
    .replace(/WinSweeps/gi, "casinovasgaming")
    .replace(/Spinora/g, "casinovasgaming")
    .replace(/spinora/gi, "casinovasgaming")
    .replace(/spinoracasinos\.com/gi, "casinovasgaming.com");
}

function brandPost<T extends MarketingPost>(post: T): T {
  return {
    ...post,
    title: brandText(post.title) ?? post.title,
    excerpt: brandText(post.excerpt),
    cover_image_url: resolveBlogCoverUrl(post.slug, post.cover_image_url),
    seo_title: brandText(post.seo_title),
    seo_description: brandText(post.seo_description),
    tags: (post.tags ?? []).map((t) => brandText(t) ?? t),
  };
}

function brandPostFull(post: MarketingPostFull): MarketingPostFull {
  const branded = brandPost(post);
  return {
    ...branded,
    content: brandText(post.content) ?? post.content,
  };
}

const FALLBACK_POSTS: MarketingPostFull[] = [
  {
    id: "fallback-1",
    slug: "welcome-to-casinova",
    title: "Welcome to Casinova — How to Get Started",
    excerpt:
      "Create your account, request a game desk, deposit, and start playing with VIP rewards.",
    content:
      "<p>Casinova is your premium gaming desk. Register, open a game page, deposit, load credits, and climb VIP tiers.</p>",
    cover_image_url:
      "https://images.pexels.com/photos/8817671/pexels-photo-8817671.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    tags: ["getting started"],
    published_at: new Date().toISOString(),
    seo_title: "Welcome to Casinova — Getting Started",
    seo_description: "How to register and play at Casinova Gaming.",
  },
  {
    id: "fallback-2",
    slug: "how-to-deposit-casinova",
    title: "How to Deposit at Casinova",
    excerpt: "Step-by-step deposit flow — request, proof, approval, and wallet credit.",
    content:
      "<p>Go to Dashboard → Deposit, submit your request, then load credits into your game after approval.</p>",
    cover_image_url:
      "https://images.pexels.com/photos/5437587/pexels-photo-5437587.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    tags: ["deposit"],
    published_at: new Date().toISOString(),
    seo_title: "How to Deposit at Casinova",
    seo_description: "Casinova deposit guide.",
  },
  {
    id: "fallback-3",
    slug: "casinova-vip-rewards-explained",
    title: "Casinova VIP Rewards Explained",
    excerpt: "Bronze to Platinum — how VIP points work and what each tier unlocks.",
    content:
      "<p>Earn VIP points from play and referrals. Climb Silver, Gold, and Platinum for better perks.</p>",
    cover_image_url:
      "https://images.pexels.com/photos/7584353/pexels-photo-7584353.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    tags: ["vip"],
    published_at: new Date().toISOString(),
    seo_title: "Casinova VIP Explained",
    seo_description: "VIP tiers at Casinova Gaming.",
  },
];

export async function getPublishedBlogPosts(): Promise<MarketingPost[]> {
  try {
    const supabase = createStaticClient();
    const { data, error } = await supabase
      .from("blog_posts")
      .select(
        "id, slug, title, excerpt, cover_image_url, tags, published_at, seo_title, seo_description"
      )
      .eq("is_published", true)
      .order("published_at", { ascending: false })
      .limit(100);
    if (error || !data?.length) return FALLBACK_POSTS.map(brandPost);
    return (data as MarketingPost[]).map(brandPost);
  } catch {
    return FALLBACK_POSTS.map(brandPost);
  }
}

export async function getBlogPost(slug: string): Promise<MarketingPostFull | null> {
  try {
    const supabase = createStaticClient();
    const { data } = await supabase
      .from("blog_posts")
      .select(
        "id, slug, title, excerpt, cover_image_url, tags, published_at, seo_title, seo_description, content"
      )
      .eq("slug", slug)
      .eq("is_published", true)
      .maybeSingle();
    if (data) return brandPostFull(data as MarketingPostFull);
  } catch {
    // fall through
  }
  const fb = FALLBACK_POSTS.find((p) => p.slug === slug);
  return fb ? brandPostFull(fb) : null;
}

export async function getLatestBlogPosts(limit = 6): Promise<MarketingPost[]> {
  const posts = await getPublishedBlogPosts();
  return posts.slice(0, limit);
}

// ── Geo (state/city) pages — admin-managed, static fallback = GEO_STATES ────

async function withGeoFallback(fetchFn: () => Promise<StateData[] | null>): Promise<StateData[]> {
  try {
    const rows = await fetchFn();
    if (rows?.length) return rows;
  } catch {
    // fall through
  }
  return Object.values(GEO_STATES);
}

export async function getGeoStates(): Promise<StateData[]> {
  return withGeoFallback(async () => {
    const supabase = createStaticClient();
    const { data: states, error } = await supabase
      .from("geo_states")
      .select("id, slug, name, abbr, hero_lede, meta_description, sort_order")
      .eq("is_active", true)
      .order("sort_order");
    if (error || !states?.length) return null;

    const { data: cities } = await supabase
      .from("geo_cities")
      .select("state_id, slug, name, description_snippet, sort_order")
      .eq("is_active", true)
      .order("sort_order");

    return states.map((s) => ({
      name: s.name,
      abbr: s.abbr,
      slug: s.slug,
      heroLede: s.hero_lede,
      metaDescription: s.meta_description,
      cities: (cities ?? [])
        .filter((c) => c.state_id === s.id)
        .map((c) => ({
          name: c.name,
          slug: c.slug,
          descriptionSnippet: c.description_snippet,
        })),
    })) as StateData[];
  });
}

export async function getGeoState(slug: string): Promise<StateData | null> {
  const states = await getGeoStates();
  return states.find((s) => s.slug === slug) ?? null;
}

export async function getGeoCity(stateSlug: string, citySlug: string): Promise<CityData | null> {
  const state = await getGeoState(stateSlug);
  return state?.cities.find((c) => c.slug === citySlug) ?? null;
}

export async function allGeoStateSlugs(): Promise<string[]> {
  return (await getGeoStates()).map((s) => s.slug);
}

export async function allGeoCityParams(): Promise<{ state: string; city: string }[]> {
  return (await getGeoStates()).flatMap((s) =>
    s.cities.map((c) => ({ state: s.slug, city: c.slug }))
  );
}
