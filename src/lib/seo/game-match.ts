import { GAMES, type Game } from "@/lib/games";

/**
 * Find the game a blog post is about, so the post can link to its /games hub.
 *
 * Matches a game when its name or slug appears in the post tags or title.
 * Prefers live games over "upcoming" ones, and longer names first so
 * "Orion Stars" wins over a bare "stars". Returns null when nothing matches.
 */
export function findGameForPost(
  post: { title?: string | null; tags?: string[] | null },
  games: readonly Game[] = GAMES
): Game | null {
  const haystack = [post.title ?? "", ...(post.tags ?? [])].join(" ").toLowerCase();
  if (!haystack.trim()) return null;

  const candidates = games
    .filter((game) => {
      const name = game.name.toLowerCase();
      const slug = game.slug.toLowerCase().replace(/-/g, " ");
      return haystack.includes(name) || haystack.includes(slug);
    })
    .sort((a, b) => {
      // Live games before upcoming, then longer (more specific) names first.
      if (!!a.upcoming !== !!b.upcoming) return a.upcoming ? 1 : -1;
      return b.name.length - a.name.length;
    });

  return candidates[0] ?? null;
}
