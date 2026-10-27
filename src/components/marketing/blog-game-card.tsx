import Link from "next/link";
import Image from "next/image";
import { Play } from "lucide-react";
import type { Game } from "@/lib/games";

/**
 * "Play [Game]" card for a blog post whose topic maps to a game.
 * Links to the game hub (/games/[slug]) — the commercial page — not an
 * external lobby, so the internal link passes authority to the hub.
 */
export function BlogGameCard({ game }: { game: Game }) {
  return (
    <Link
      href={`/games/${game.slug}`}
      className={`group my-10 flex items-center gap-4 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br ${game.gradient} p-4 transition-transform hover:scale-[1.01] sm:p-5`}
    >
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-black/30 sm:h-20 sm:w-20">
        <Image
          src={game.image}
          alt={game.name}
          fill
          sizes="80px"
          className="object-cover"
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/70">
          Play now
        </p>
        <p className="truncate text-lg font-black text-white">{game.name}</p>
        <p className="mt-0.5 line-clamp-1 text-xs text-white/70">{game.provider}</p>
      </div>
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/15 px-4 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-white backdrop-blur transition-colors group-hover:bg-white/25">
        <Play className="h-3.5 w-3.5 fill-current" /> Open
      </span>
    </Link>
  );
}
