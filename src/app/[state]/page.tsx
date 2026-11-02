import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { GeoPageTemplate } from "@/components/marketing/geo-page-template";
import { allGeoStateSlugs, getGeoState } from "@/lib/data/marketing";
import { isGeoStateIndexable } from "@/lib/seo/geo-index";
import { SITE_NAME } from "@/lib/constants";

export const revalidate = 86400;
export const dynamicParams = true;

const RESERVED = new Set([
  "admin",
  "api",
  "auth",
  "blog",
  "contact",
  "dashboard",
  "games",
  "leaderboard",
  "login",
  "privacy",
  "promotions",
  "register",
  "reset-password",
  "robots.txt",
  "sitemap.xml",
  "spin",
  "support",
  "terms",
  "vip",
  "about",
  "maintenance",
  "help",
  "responsible-play",
  "llms.txt",
]);

export async function generateStaticParams() {
  return (await allGeoStateSlugs()).map((state) => ({ state }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ state: string }>;
}): Promise<Metadata> {
  const { state: stateSlug } = await params;
  if (RESERVED.has(stateSlug)) return {};
  const state = await getGeoState(stateSlug);
  if (!state) return {};

  const indexable = isGeoStateIndexable(stateSlug);
  // Informational framing: the page explains how the platform works for someone
  // in this state. It must not read as a claim that play is available or legal there.
  const title = `Sweepstakes Fish Table Games for ${state.name} Players: How ${SITE_NAME} Works | ${SITE_NAME}`;
  const description = `How ${SITE_NAME} works for players in ${state.name}: one wallet, card deposits, eight live games, VIP rewards. 18+. Availability varies by jurisdiction.`;
  return {
    title,
    description,
    alternates: { canonical: `/${stateSlug}` },
    robots: indexable ? undefined : { index: false, follow: true },
  };
}

export default async function StatePage({
  params,
}: {
  params: Promise<{ state: string }>;
}) {
  const { state: stateSlug } = await params;
  if (RESERVED.has(stateSlug)) notFound();
  const state = await getGeoState(stateSlug);
  if (!state) notFound();

  return <GeoPageTemplate state={state} indexable={isGeoStateIndexable(stateSlug)} />;
}
