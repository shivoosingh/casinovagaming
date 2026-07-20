import { createStaticClient } from "@/lib/supabase/static";

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
      .limit(50);
    if (error || !data?.length) return FALLBACK_POSTS;
    return data as MarketingPost[];
  } catch {
    return FALLBACK_POSTS;
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
    if (data) return data as MarketingPostFull;
  } catch {
    // fall through
  }
  return FALLBACK_POSTS.find((p) => p.slug === slug) ?? null;
}
