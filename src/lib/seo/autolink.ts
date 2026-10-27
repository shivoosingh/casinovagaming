import { GAMES } from "@/lib/games";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Add internal links to game hubs inside a blog post's HTML content.
 *
 * Links the first mention of each game name to /games/[slug], so posts pass
 * authority down to the commercial hubs and readers can jump straight to the
 * game. Safeguards:
 *  - only rewrites text, never inside existing <a> tags or HTML attributes;
 *  - at most one link per game, and a total cap (default 4) to avoid spam;
 *  - longest names first, and matches are resolved on the original text and
 *    spliced non-overlapping, so a short name ("Stars") can never land inside
 *    a longer one already linked ("Orion Stars") or inside an inserted anchor;
 *  - whole-word, case-insensitive matching.
 */
export function autolinkGames(html: string, max = 4): string {
  if (!html) return html;

  const games = [...GAMES]
    .filter((g) => !g.upcoming)
    .sort((a, b) => b.name.length - a.name.length);

  const linked = new Set<string>();
  let count = 0;

  const tokens = html.split(/(<[^>]+>)/);
  let insideAnchor = 0;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.startsWith("<")) {
      if (/^<a[\s>]/i.test(token)) insideAnchor++;
      else if (/^<\/a>/i.test(token)) insideAnchor = Math.max(0, insideAnchor - 1);
      continue;
    }
    if (insideAnchor > 0 || count >= max) continue;

    // 1) Find each eligible game's first match on the ORIGINAL token text.
    const hits: { index: number; length: number; slug: string; text: string }[] = [];
    for (const game of games) {
      if (linked.has(game.slug)) continue;
      const re = new RegExp(`(?<![A-Za-z0-9])(${escapeRegExp(game.name)})(?![A-Za-z0-9])`, "i");
      const m = re.exec(token);
      if (m) hits.push({ index: m.index, length: m[1].length, slug: game.slug, text: m[1] });
    }

    // 2) Accept non-overlapping hits, left to right, respecting the cap.
    hits.sort((a, b) => a.index - b.index || b.length - a.length);
    const accepted: typeof hits = [];
    let cursor = 0;
    for (const hit of hits) {
      if (count >= max) break;
      if (hit.index < cursor || linked.has(hit.slug)) continue;
      accepted.push(hit);
      linked.add(hit.slug);
      cursor = hit.index + hit.length;
      count++;
    }
    if (accepted.length === 0) continue;

    // 3) Splice anchors in from right to left so earlier indices stay valid.
    let text = token;
    for (const hit of accepted.sort((a, b) => b.index - a.index)) {
      const anchor = `<a href="/games/${hit.slug}" class="text-violet-300 underline underline-offset-2 hover:text-fuchsia-300">${hit.text}</a>`;
      text = text.slice(0, hit.index) + anchor + text.slice(hit.index + hit.length);
    }
    tokens[i] = text;
  }

  return tokens.join("");
}
