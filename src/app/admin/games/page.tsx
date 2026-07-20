import type { Metadata } from "next";
import Image from "next/image";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { GAMES } from "@/lib/games";
import { requirePermission } from "@/lib/data/admin";

export const metadata: Metadata = { title: "Games" };

function flagLabel(game: (typeof GAMES)[number]) {
  if (game.upcoming) return "Upcoming";
  if (game.trending) return "Trending";
  if (game.popular) return "Popular";
  if (game.topRated) return "Top rated";
  if (game.promotional) return "Promo";
  return null;
}

export default async function AdminGamesPage() {
  await requirePermission("cms.manage");

  return (
    <div className="mx-auto max-w-6xl">
      <AdminPageHeader
        title="Games Catalog"
        description={`Read-only view of ${GAMES.length} games from src/lib/games.ts — the player-facing catalog.`}
      />

      <div className="mb-6 rounded-2xl border border-violet-400/20 bg-[rgba(18,14,34,0.5)] p-4 text-sm text-slate-400">
        This list is code-defined, not database-driven. Edit{" "}
        <code className="text-violet-200">src/lib/games.ts</code> to add or update games.
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {GAMES.map((game) => {
          const flag = flagLabel(game);
          return (
            <div
              key={game.id}
              className="overflow-hidden rounded-2xl border border-violet-400/25 bg-[rgba(18,14,34,0.72)]"
            >
              <div className="relative aspect-video bg-black/30">
                <Image
                  src={game.image}
                  alt={game.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
                {flag && (
                  <span className="absolute right-2 top-2 rounded-full bg-fuchsia-600/90 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                    {flag}
                  </span>
                )}
              </div>
              <div className="space-y-2 p-4">
                <div>
                  <p className="font-semibold text-white">{game.name}</p>
                  <p className="text-xs text-slate-500">
                    {game.provider} · {game.category}
                  </p>
                </div>
                <p className="line-clamp-2 text-xs text-slate-400">{game.bio}</p>
                <div className="space-y-1 text-xs text-slate-500">
                  <p>
                    Slug: <span className="text-violet-200">/games/{game.slug}</span>
                  </p>
                  <p className="truncate">Download: {game.downloadUrl}</p>
                  <p>{game.players.toLocaleString()} players (display stat)</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
