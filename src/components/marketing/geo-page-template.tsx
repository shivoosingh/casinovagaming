import Link from "next/link";
import { MapPin } from "lucide-react";

import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { MarketingGameGrid } from "@/components/marketing/game-grid";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { GlassCard } from "@/components/shared/glass-card";
import { Button } from "@/components/ui/button";
import { SITE_NAME } from "@/lib/constants";
import { GAMES } from "@/lib/games";
import { BONUS_HEADLINE, MIN_DEPOSIT } from "@/lib/offers";
import { FaqSchema } from "@/lib/seo/json-ld";
import type { CityData, StateData } from "@/lib/geo-data";

interface GeoPageTemplateProps {
  state: StateData;
  city?: CityData;
  /** Only allow-listed states (src/lib/seo/geo-index.ts) emit FAQ schema; the rest are noindex. */
  indexable?: boolean;
}

/** One sentence, used wherever a reader might otherwise infer "legal in my state". */
export const GEO_COMPLIANCE_LINE =
  `${SITE_NAME} is for players 18+. Sweepstakes availability varies by jurisdiction; void where prohibited.`;

function geoFaqs(location: string) {
  const liveCount = GAMES.filter((g) => !g.upcoming).length;
  return [
    {
      q: `Can I use ${SITE_NAME} from ${location}?`,
      a: `${SITE_NAME} is an online sweepstakes gaming platform, not a venue in ${location}. Whether you can take part depends on your state and local law and on being 18 or older, which you confirm at signup. We do not make legality claims for any state.`,
    },
    {
      q: `How does it work?`,
      a: `Create a free account, deposit by card into one wallet (minimum load $${MIN_DEPOSIT}), then create a login for any of the ${liveCount} live games and load credits from the wallet. Your first deposit is matched 100% and your second 50% when you load.`,
    },
    {
      q: `How do I reach support?`,
      a: `Live chat and dashboard messages are available 24/7. Game account requests are usually processed within 24 hours.`,
    },
  ];
}

function GeoFaqs({ location, indexable }: { location: string; indexable: boolean }) {
  const faqs = geoFaqs(location);
  return (
    <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      {indexable && <FaqSchema items={faqs} />}
      <h2 className="mb-6 text-xl font-bold">Questions from {location} players</h2>
      <div className="space-y-4">
        {faqs.map(({ q, a }) => (
          <GlassCard key={q} className="p-5">
            <h3 className="font-semibold">{q}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{a}</p>
          </GlassCard>
        ))}
      </div>
    </section>
  );
}

export function GeoPageTemplate({ state, city, indexable = false }: GeoPageTemplateProps) {
  const locationName = city ? `${city.name}, ${state.abbr}` : state.name;
  const liveCount = GAMES.filter((g) => !g.upcoming).length;

  const crumbs = [
    { name: "Home", href: "/" },
    ...(city ? [{ name: state.name, href: `/${state.slug}` }] : []),
    { name: locationName },
  ];

  return (
    <>
      <Navbar />
      <main className="pt-24 pb-16">
        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          <Breadcrumbs items={crumbs} />

          <p className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-orange-400">
            <MapPin className="size-3.5" aria-hidden />
            {locationName}
          </p>
          <h1 className="max-w-3xl text-3xl font-bold sm:text-4xl">
            Sweepstakes fish table games for players in{" "}
            <span className="gradient-text">{locationName}</span>
          </h1>
          <p className="mt-4 max-w-2xl text-muted-foreground leading-relaxed">
            {SITE_NAME} is an online platform. If you are in {locationName}, this page explains how it works:
            one wallet funded by card, a login for each of the {liveCount} live games, and redeem rules shown
            in every game panel. {BONUS_HEADLINE}, applied when you load.
          </p>
          <p className="mt-3 max-w-2xl text-xs text-muted-foreground">{GEO_COMPLIANCE_LINE}</p>

          {state.heroImageUrl && (
            <div className="mt-6 overflow-hidden rounded-2xl border border-border/60 max-w-3xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={state.heroImageUrl}
                alt={`${locationName} skyline`}
                className="w-full h-48 sm:h-64 object-cover"
              />
            </div>
          )}

          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/register">Create free account</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/games">See the {liveCount} live games</Link>
            </Button>
          </div>
        </section>

        {!city && state.cities.length > 0 && (
          <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
            <h2 className="mb-4 text-lg font-semibold">Cities in {state.name}</h2>
            <div className="flex flex-wrap gap-2">
              {state.cities.map((c) => (
                <Link
                  key={c.slug}
                  href={`/${state.slug}/${c.slug}`}
                  className="rounded-full border border-white/10 bg-[#1a1a1a] px-4 py-2 text-sm hover:border-orange-500/40"
                >
                  {c.name}
                </Link>
              ))}
            </div>
          </section>
        )}

        <MarketingGameGrid
          title={`The ${liveCount} live games`}
          lede={`Every live game loads from the same ${SITE_NAME} wallet, with the same $${MIN_DEPOSIT} minimum and the same redeem rules. Games marked coming soon cannot be loaded yet.`}
        />

        <GeoFaqs location={locationName} indexable={indexable} />

        <section className="mx-auto max-w-7xl px-4 py-12 text-center sm:px-6">
          <h2 className="text-2xl font-bold">Ready to start?</h2>
          <p className="mt-2 text-muted-foreground">Free account · Card deposits · 24/7 support</p>
          <Button asChild className="mt-6">
            <Link href="/register">Create free account</Link>
          </Button>
          <p className="mt-4 text-xs text-muted-foreground">
            {GEO_COMPLIANCE_LINE} <Link href="/responsible-play" className="underline">Responsible play</Link>
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
