"use client";

import Image from "next/image";
import Link from "next/link";
import { Star, Users } from "lucide-react";
import type { Game } from "@/lib/games";
import { useInView } from "@/lib/hooks/use-in-view";
import { cn } from "@/lib/utils";

interface CompactGameCardProps {
  game: Game;
  variant?: "slider" | "grid";
  className?: string;
  eager?: boolean;
}

function formatPlayers(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(n);
}

function ratingFor(game: Game) {
  if (game.topRated) return "4.9";
  if (game.popular) return "4.8";
  if (game.trending) return "4.7";
  return "4.5";
}

export function CompactGameCard({ game, variant = "grid", className, eager = false }: CompactGameCardProps) {
  const { ref, inView } = useInView("800px", eager);
  const showImage = eager || inView;
  const href = `/games/${game.slug}`;
  const isSlider = variant === "slider";

  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      className={cn(
        "cx-game-card group relative overflow-hidden rounded-[1.25rem]",
        isSlider ? "w-[132px] sm:w-[148px] aspect-[3/4] shrink-0" : "w-full aspect-[3/4]",
        className
      )}
    >
      <Link
        href={href}
        prefetch
        className="absolute inset-0 z-40 block cursor-pointer"
        aria-label={game.upcoming ? `${game.name} — coming soon` : `Play ${game.name}`}
        draggable={false}
      />

      <div className="absolute inset-0 overflow-hidden rounded-[1.25rem]">
        {showImage ? (
          <Image
            src={game.image}
            alt={game.name}
            fill
            priority={eager}
            loading={eager ? "eager" : "lazy"}
            className="object-cover object-center transition-transform duration-700 ease-out group-hover:scale-110"
            sizes={isSlider ? "148px" : "(max-width:640px) 45vw,(max-width:1024px) 30vw,220px"}
          />
        ) : (
          <div className="absolute inset-0 animate-pulse bg-[#12101c]" aria-hidden />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-90" />
        <div className="cx-game-shine pointer-events-none absolute inset-0" aria-hidden />

        <div className="absolute left-2 top-2 z-10">
          {!game.upcoming ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-500/25 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-200 backdrop-blur-md">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              Live
            </span>
          ) : (
            <span className="rounded-full border border-violet-400/40 bg-violet-500/30 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-violet-100 backdrop-blur-md">
              Soon
            </span>
          )}
        </div>

        {!game.upcoming && (
          <div className="absolute right-2 top-2 z-10 inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/45 px-1.5 py-0.5 text-[9px] font-semibold text-slate-200 backdrop-blur-md">
            <Users className="h-2.5 w-2.5 text-sky-300" />
            {formatPlayers(game.players)}
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 z-10 p-3">
          <div className="mb-1 flex items-center gap-1 text-amber-300">
            <Star className="h-3 w-3 fill-current" />
            <span className="text-[10px] font-black">{ratingFor(game)}</span>
          </div>
          <p
            className="line-clamp-1 font-bold text-white"
            style={{
              fontSize: isSlider ? "0.72rem" : "clamp(0.78rem,1.4vw,0.92rem)",
              textShadow: "0 2px 14px rgba(0,0,0,0.85)",
            }}
          >
            {game.name}
          </p>
        </div>
      </div>
    </div>
  );
}
