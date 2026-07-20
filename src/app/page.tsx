import { HomeLandingShell } from "@/components/home/home-landing-shell";
import { HeroStatic } from "@/components/home/hero-static";
import { HomeIntroGate } from "@/components/home/casinova-intro";

export default function HomePage() {
  return (
    <HomeIntroGate>
      <HomeLandingShell hero={<HeroStatic />} />
    </HomeIntroGate>
  );
}
