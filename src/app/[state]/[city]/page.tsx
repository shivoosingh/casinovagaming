import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { GeoPageTemplate } from "@/components/marketing/geo-page-template";
import { allGeoCityParams, getGeoCity, getGeoState } from "@/lib/data/marketing";
import { SITE_NAME } from "@/lib/constants";

export const revalidate = 86400;
export const dynamicParams = true;

export async function generateStaticParams() {
  return await allGeoCityParams();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ state: string; city: string }>;
}): Promise<Metadata> {
  const { state: stateSlug, city: citySlug } = await params;
  const city = await getGeoCity(stateSlug, citySlug);
  if (!city) return {};

  // City pages are templated with no unique content: kept for visitors who land
  // on them, never indexed. The state page is the canonical geo entry point.
  const title = `Fish Table Games for ${city.name} Players: How ${SITE_NAME} Works | ${SITE_NAME}`;
  return {
    title,
    description: `How ${SITE_NAME} works for players in ${city.name}: one wallet, card deposits, eight live games. 18+. Availability varies by jurisdiction.`,
    alternates: { canonical: `/${stateSlug}/${citySlug}` },
    robots: { index: false, follow: true },
  };
}

export default async function CityPage({
  params,
}: {
  params: Promise<{ state: string; city: string }>;
}) {
  const { state: stateSlug, city: citySlug } = await params;
  const city = await getGeoCity(stateSlug, citySlug);
  if (!city) notFound();

  const state = await getGeoState(stateSlug);
  if (!state) notFound();

  return <GeoPageTemplate state={state} city={city} indexable={false} />;
}
