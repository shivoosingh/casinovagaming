import { GameCard } from "@/components/home/game-card";
import { GAMES } from "@/lib/games";

export function MarketingGameGrid({
  title = "Choose your game",
  lede = "Pick any game below — create your account, load credits from your wallet, and play.",
}: {
  title?: string;
  lede?: string;
}) {
  const games = GAMES.filter((g) => !g.upcoming);

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="mb-8 max-w-2xl">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-orange-400">
          {games.length} games available
        </p>
        <h2 className="text-2xl font-bold sm:text-3xl">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">{lede}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 xl:grid-cols-5">
        {games.map((game, index) => (
          <GameCard key={game.slug} game={game} eager={index < 8} />
        ))}
      </div>
    </section>
  );
}
