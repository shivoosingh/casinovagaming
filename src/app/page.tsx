import { HomeLandingShell } from "@/components/home/home-landing-shell";
import { HeroStatic } from "@/components/home/hero-static";

export default function HomePage() {
  return <HomeLandingShell hero={<HeroStatic />} />;
}
