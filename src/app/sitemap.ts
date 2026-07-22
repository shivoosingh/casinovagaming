import type { MetadataRoute } from "next";
import { SITE_URL, PUBLIC_ROUTES } from "@/lib/constants";
import { GAMES } from "@/lib/games";
import { getGameSitemapPriority } from "@/lib/seo/game-seo";
import { allGeoCityParams, allGeoStateSlugs } from "@/lib/data/marketing";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes = PUBLIC_ROUTES.map((route) => ({
    url: `${SITE_URL}${route.path}`,
    lastModified: new Date(),
    changeFrequency: route.path === "/" ? ("daily" as const) : ("weekly" as const),
    priority: route.priority,
  }));

  const gameRoutes = GAMES.filter((g) => !g.upcoming).map((game) => ({
    url: `${SITE_URL}/games/${game.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: getGameSitemapPriority(game),
  }));

  let geoRoutes: MetadataRoute.Sitemap = [];
  try {
    const [states, cities] = await Promise.all([allGeoStateSlugs(), allGeoCityParams()]);
    geoRoutes = [
      ...states.map((slug) => ({
        url: `${SITE_URL}/${slug}`,
        lastModified: new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),
      ...cities.map(({ state, city }) => ({
        url: `${SITE_URL}/${state}/${city}`,
        lastModified: new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.6,
      })),
    ];
  } catch {
    // Geo tables may not be migrated yet
  }

  return [...staticRoutes, ...gameRoutes, ...geoRoutes];
}
