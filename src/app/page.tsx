import { HomeFaqSchema, HomeGamesItemListSchema } from "@/lib/seo/json-ld";
import { HomeLandingShell } from "@/components/home/home-landing-shell";
import { HeroStatic } from "@/components/home/hero-static";
import { HomeIntroGate } from "@/components/home/casinova-intro";
import { HomeGuides } from "@/components/home/home-guides";
import { PlayByStateSection } from "@/components/marketing/play-by-state-section";
import { getLatestBlogPosts } from "@/lib/data/marketing";

export default async function HomePage() {
  const posts = await getLatestBlogPosts(6);

  return (
    <>
      <HomeGamesItemListSchema />
      <HomeFaqSchema />
      <HomeIntroGate>
        <HomeLandingShell
          hero={<HeroStatic />}
          belowFold={
            <>
              <PlayByStateSection />
              <HomeGuides posts={posts} />
            </>
          }
        />
      </HomeIntroGate>
    </>
  );
}
