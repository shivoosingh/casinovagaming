import { HomeLandingShell } from "@/components/home/home-landing-shell";
import { HeroStatic } from "@/components/home/hero-static";
import { HomeIntroGate } from "@/components/home/casinova-intro";
import { HomeGuides } from "@/components/home/home-guides";
import { PlayByStateSection } from "@/components/marketing/play-by-state-section";
import { getLatestBlogPosts } from "@/lib/data/marketing";
import { createMetadata } from "@/lib/seo/metadata";

export const metadata = createMetadata({
  title: "All Games",
  description:
    "Browse all online sweepstakes casino games, slot machines, fish games, and table games available on Casinova.",
  keywords: ["all games", "sweepstakes games", "online casino slots", "fish games", "juwa", "game vault", "fire kirin"],
  path: "/games",
});

export const dynamic = "force-dynamic";

export default async function AllGamesPage() {
  const posts = await getLatestBlogPosts(6);

  return (
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
  );
}
